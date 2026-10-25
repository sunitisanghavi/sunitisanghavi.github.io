# Generates assets/js/spectrum-data.js: a *schematic* top-of-atmosphere reflectance spectrum
# (vegetated surface, nadir, two-way path) for the "anatomy of a measurement" figure.
#
# Not a radiative transfer calculation: line positions come from simple rigid-rotor P/R
# branches (O2, CO2, N2O, CH4) or seeded random line lists (H2O), with Lorentz profiles.
# Only meant to convey the density and saturation structure of real absorption spectra.
#
# Run from the project root:  julia scripts/make_spectrum.jl

using Random
Random.seed!(42)

const C2 = 1.4388      # second radiation constant [cm K]
const T  = 250.0       # rotational temperature [K]
const γ  = 0.07        # Lorentz HWHM [cm⁻¹]

struct Band
    gas::String
    ν0::Float64        # band origin [cm⁻¹]
    τpeak::Float64     # optical depth at the strongest line centre (two-way path)
    kind::Symbol       # :linear, :random, :broad
    B::Float64         # rotational constant [cm⁻¹] (:linear) or half-width [cm⁻¹] (:random/:broad)
    step::Int          # 1 = every J, 2 = every other J (O2, CO2)
    qbranch::Bool
end
Band(gas, ν0, τ, kind, B; step=1, q=false) = Band(gas, ν0, τ, kind, B, step, q)

const BANDS = [
    Band("O3",  1e7/600, 0.07, :broad, 1400.0),
    Band("O2",  15902.0, 0.4,  :linear, 1.44; step=2),     # γ band, 629 nm
    Band("O2",  14525.0, 4.0,  :linear, 1.44; step=2),     # B band, 688 nm
    Band("O2",  13122.0, 12.0, :linear, 1.44; step=2),     # A band, 762 nm
    Band("O2",   7882.0, 1.5,  :linear, 1.44; step=2),     # a¹Δg (singlet delta), 1.27 µm
    Band("H2O", 13900.0, 3.0,  :random, 220.0),
    Band("H2O", 12200.0, 6.0,  :random, 260.0),
    Band("H2O", 10600.0, 60.0, :random, 380.0),
    Band("H2O",  8800.0, 90.0, :random, 380.0),
    Band("H2O",  7250.0, 4000.0, :random, 450.0),
    Band("H2O",  5330.0, 4000.0, :random, 420.0),
    Band("CO2",  6350.0, 1.2,  :linear, 0.39; step=2),
    Band("CO2",  6230.0, 1.5,  :linear, 0.39; step=2),
    Band("CO2",  4980.0, 25.0, :linear, 0.39; step=2),
    Band("CO2",  4850.0, 30.0, :linear, 0.39; step=2),
    Band("CH4",  6005.0, 3.0,  :linear, 5.24; q=true),
    Band("CH4",  4300.0, 8.0,  :linear, 5.24; q=true),
    Band("N2O",  4417.0, 0.5,  :linear, 0.419),
]

# Line list: (ν, peak τ, gas)
function lines(b::Band)
    out = Tuple{Float64,Float64}[]
    if b.kind == :linear
        Jmax = round(Int, 3.5 * sqrt(T / (C2 * b.B)))
        for m in 1:b.step:Jmax
            s = m * exp(-b.B * m * (m + 1) * C2 / T)
            push!(out, (b.ν0 + 2b.B * (m + 1), s))    # R branch
            push!(out, (b.ν0 - 2b.B * m, s))          # P branch
            b.gas == "O2" && push!(out, (b.ν0 - 2b.B * m - 1.9, 0.8s))  # spin-split doublet
        end
        if b.qbranch
            smax = maximum(last, out)
            for _ in 1:25
                push!(out, (b.ν0 + 1.5randn(), 0.6smax * rand()))
            end
        end
    elseif b.kind == :random
        for _ in 1:1500
            push!(out, (b.ν0 + b.B * clamp(0.4randn(), -1.2, 1.2), rand()^7))
        end
    end
    isempty(out) && return out
    smax = maximum(last, out)
    [(ν, b.τpeak * s / smax) for (ν, s) in out]
end

# Fine wavenumber grid
const νgrid = collect(4100.0:0.02:25000.0)
τ = zeros(length(νgrid))
idx(ν) = clamp(round(Int, (ν - 4100.0) / 0.02) + 1, 1, length(νgrid))

ranges = Dict{String,Vector{Tuple{Float64,Float64}}}()
for b in BANDS
    if b.kind == :broad
        @. τ += b.τpeak * exp(-0.5 * ((νgrid - b.ν0) / (b.B / 2.355))^2)
        lo, hi = b.ν0 - b.B / 2, b.ν0 + b.B / 2
    else
        ls = lines(b)
        for (ν, s) in ls
            i1, i2 = idx(ν - 40γ), idx(ν + 40γ)
            @inbounds for i in i1:i2
                τ[i] += s * γ^2 / ((νgrid[i] - ν)^2 + γ^2)
            end
        end
        strong = [ν for (ν, s) in ls if s > (b.kind == :random ? 0.05 : 0.02) * b.τpeak]
        lo, hi = minimum(strong), maximum(strong)
    end
    push!(get!(ranges, b.gas, Tuple{Float64,Float64}[]), (1e7 / hi, 1e7 / lo))
end
trans = exp.(-τ)

# Surface: 60 % vegetation (red edge) + 40 % bare soil, so that bands in the red stay visible
function albedo(λ)
    vis  = 0.04 + 0.04exp(-0.5((λ - 550) / 30)^2)
    edge = 0.42 / (1 + exp(-(λ - 715) / 11))
    swir = λ > 1250 ? -0.22 * (1 - exp(-(λ - 1250) / 600)) : 0.0
    soil = 0.12 + 0.22 * min((λ - 400) / 1400, 1.0)
    0.6 * (vis + edge + swir) + 0.4 * soil
end
rayleigh(λ) = 0.13 * (450 / λ)^4

# Bin-average transmission onto a wavelength grid (instrument-like)
function binned(λlo, λhi, dλ)
    λs = collect(λlo:dλ:λhi)
    T̄ = similar(λs)
    for (k, λ) in enumerate(λs)
        i1, i2 = idx(1e7 / (λ + dλ / 2)), idx(1e7 / (λ - dλ / 2))
        T̄[k] = sum(@view trans[i1:i2]) / (i2 - i1 + 1)
    end
    λs, T̄
end

fmt(x) = string(round(x; digits=1))

# Main strip: 400–2400 nm, 0–0.6 reflectance mapped to 680 × 170 px
λs, T̄ = binned(400.0, 2400.0, 1.5)
pts = String[]
for (λ, t) in zip(λs, T̄)
    I = albedo(λ) * t + rayleigh(λ) * sqrt(t)
    push!(pts, fmt((λ - 400) / 2000 * 680) * "," * fmt(170 - min(I, 0.6) / 0.6 * 170))
end
mainpts = join(pts, " ")

# Rayleigh-only contribution (for highlighting scattering)
raypts = join([fmt((λ - 400) / 2000 * 680) * "," * fmt(170 - rayleigh(λ) / 0.6 * 170) for λ in 400:10:2400], " ")

# Inset: O2 A band at 0.01 nm, 758–771 nm mapped to 260 × 100 px
λi, Ti = binned(758.0, 771.0, 0.01)
ins = join([fmt((λ - 758) / 13 * 260) * "," * fmt(100 - t * 95) for (λ, t) in zip(λi, Ti)], " ")

bandjs = join(["{gas:\"$g\",lo:$(round(lo; digits=1)),hi:$(round(hi; digits=1))}"
               for (g, rs) in ranges for (lo, hi) in rs], ",\n    ")

open(joinpath(@__DIR__, "..", "assets", "js", "spectrum-data.js"), "w") do io
    println(io, "// Generated by scripts/make_spectrum.jl — schematic, not an RT calculation.")
    println(io, "window.SPECTRUM = {")
    println(io, "  main: \"$mainpts\",")
    println(io, "  rayleigh: \"$raypts\",")
    println(io, "  inset: \"$ins\",")
    println(io, "  bands: [\n    $bandjs\n  ]")
    println(io, "};")
end
println("wrote spectrum-data.js with ", length(λs), " + ", length(λi), " points")

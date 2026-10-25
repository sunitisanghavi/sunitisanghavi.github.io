Source PDFs of the papers. They are used to write summaries and extract figures, and are
**not** published by default: `.gitignore` excludes `papers/*.pdf`, and `_quarto.yml` copies
only the PDFs listed under `resources`.

To add a "PDF" link on the publications page for a paper that may be redistributed (open
access, CC BY, arXiv, or an accepted manuscript where the publisher allows it):
1. add `pdf: <filename>` to its entry in `data/publications.yml`,
2. list `papers/<filename>` under `project.resources` in `_quarto.yml`,
3. add `!/papers/<filename>` to `.gitignore`.

Currently published: `Sanghavi_amt-2015.pdf`, `Sanghavi2012AMT.pdf` (AMT, CC BY),
`Sanghavi_2026_arXiv_2608.06649.pdf` (arXiv, CC BY), `Jeyaram_2022_JOSS.pdf` (JOSS, CC BY),
`Sanghavi_2026_JQSRT_Cabannes.pdf` (JQSRT open access, CC BY-NC).

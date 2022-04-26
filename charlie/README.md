

![](emoji-set.jpg)

## Merge and compress the output

Using [PDFtk](https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/) and [ImageMagick](https://imagemagick.org/index.php).

```console
pdftk 000.pdf 001.pdf 002.pdf 003.pdf cat output merged.pdf
convert -density 900 -quality 70 -compress jpeg merged.pdf merged_compressed.pdf
```
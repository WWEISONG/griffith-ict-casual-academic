# Static assets

## griffith-logo.svg — not yet supplied

Save the official Griffith University logo here, named exactly
`griffith-logo.svg`. It then appears automatically on the landing page, the
sign-in and register pages, and in both application headers. No code change is
needed — commit the file and push.

**Where to get it:** Griffith's brand resources, via Marketing and
Communications. Staff have access. Do not copy it from a web page: the brand
portal publishes the correct colour variants, clear-space rules and file
formats, and using the approved asset is what keeps the system compliant with
university brand policy.

**Until it is present, no mark is shown at all.** Earlier builds drew a red
tile — first a "G", then the word "Griffith" — which looked like a logo without
being one. That was wrong: a stand-in imitating a university's brand reads as
official while being incorrect. Plain typography is the honest fallback.

A `.png` works too; update the extension in `src/components/ui/Brand.tsx`.

## Favicon

`index.html` currently uses a plain red square with no lettering. Replace it
with the official favicon when you have one.

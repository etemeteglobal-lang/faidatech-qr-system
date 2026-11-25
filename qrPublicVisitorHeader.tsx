warning: in the working copy of 'src/components/qr/PublicVisitorHeader.tsx', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/src/components/qr/PublicVisitorHeader.tsx b/src/components/qr/PublicVisitorHeader.tsx[m
[1mindex 3b4b97d..942bae4 100644[m
[1m--- a/src/components/qr/PublicVisitorHeader.tsx[m
[1m+++ b/src/components/qr/PublicVisitorHeader.tsx[m
[36m@@ -14,7 +14,7 @@[m [mexport default function PublicVisitorHeader({ title, localizedContent, branding[m
   const [menuOpen, setMenuOpen] = useState(false);[m
   const [sections, setSections] = useState<{ id: string; label: string }[]>([]);[m
   const [activeSection, setActiveSection] = useState("");[m
[31m-  const supportPhone = process.env.NEXT_PUBLIC_FAIDATECH_PHONE?.trim();[m
[32m+[m[32m  const supportPhone = process.env.NEXT_PUBLIC_FAIDATECH_PHONE?.trim() || "+251975498916";[m
   const localized = localizedOverride(localizedContent, locale);[m
   const visitorTitle = localizedText(localized.title, title);[m
   const brandName = branding?.brandName || "FaidATech";[m
[36m@@ -72,8 +72,7 @@[m [mexport default function PublicVisitorHeader({ title, localizedContent, branding[m
       >[m
         <div className="flex shrink-0 items-center justify-between gap-2">[m
           <Link href="/" onClick={() => setMenuOpen(false)} className="flex min-w-0 items-center gap-2">[m
[31m-            <img src="/logo.png" alt="FaidATech" className="h-9 w-16 shrink-0 rounded-lg bg-white object-contain p-1" />[m
[31m-            <strong translate="no" className="notranslate truncate text-sm text-faida-navy">FaidATech</strong>[m
[32m+[m[32m            <img src="/logo.png" alt="FaidATech" className="h-11 w-24 shrink-0 rounded-lg bg-white object-contain p-1" />[m
           </Link>[m
           <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-faida-navy">×</button>[m
         </div>[m
[36m@@ -102,15 +101,14 @@[m [mexport default function PublicVisitorHeader({ title, localizedContent, branding[m
 [m
         <footer className="mt-3 shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 p-3">[m
           <div className="flex items-center gap-2">[m
[31m-            <img src="/logo.png" alt="FaidATech" className="h-8 w-14 shrink-0 rounded-lg bg-white object-contain p-1" />[m
[31m-            <strong translate="no" className="notranslate text-xs text-faida-navy">FaidATech</strong>[m
[32m+[m[32m            <img src="/logo.png" alt="FaidATech" className="h-11 w-24 shrink-0 rounded-lg bg-white object-contain p-1" />[m
           </div>[m
           <p className="mt-2 break-words text-[10px] leading-4 text-slate-700">[m
             Phone support: {supportPhone[m
               ? <a className="font-semibold underline" href={`tel:${supportPhone.replace(/[^+0-9]/g, "")}`}>{supportPhone}</a>[m
[31m-              : <a className="font-semibold underline" href="https://faidatech.et">faidatech.et</a>}[m
[32m+[m[32m              : <a className="font-semibold underline" href="https://faidatech.pro.et">faidatech.pro.et</a>}[m
           </p>[m
[31m-          <a href="https://faidatech.et" className="mt-1 inline-block text-[10px] font-semibold text-emerald-900 underline">faidatech.et</a>[m
[32m+[m[32m          <a href="https://faidatech.pro.et" className="mt-1 inline-block text-[10px] font-semibold text-emerald-900 underline">faidatech.pro.et</a>[m
           <Link href="/" onClick={() => setMenuOpen(false)} className="mt-2 block rounded-lg bg-emerald-700 px-2 py-2 text-center text-[10px] font-bold text-white">Create your own QR</Link>[m
         </footer>[m
       </aside>[m

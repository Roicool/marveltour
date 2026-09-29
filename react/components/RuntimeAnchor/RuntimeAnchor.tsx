/**
 * RuntimeAnchor — v1.0.0
 *
 * Görünmez "çapa". Hiçbir şey çizmez; tek işi bulunduğu sayfaya Webflow'un
 * Code Component runtime'ını yükletmek.
 *
 * NEDEN VAR
 * ---------
 * Webflow, bir sayfaya code component runtime'ını YALNIZ o sayfada en az bir
 * code component varsa ekliyor. Barba ise sayfanın <head>'ini hiç değiştirmez,
 * sadece [data-barba="container"] içeriğini enjekte eder. Dolayısıyla:
 *
 *   runtime'ı OLAN bir sayfadan → code component'li sayfaya geçiş
 *     custom element tanımı zaten kayıtlı, enjekte edilen element upgrade olur ✓
 *   runtime'ı OLMAYAN bir sayfadan → aynı sayfaya geçiş
 *     tanım hiç yüklenmemiş, element ölü DOM olarak kalır ✗
 *
 * Site genelinde React Navbar kullanılırken her sayfada bir code component
 * vardı, bu yüzden runtime her yerde yükleniyordu ve sorun görünmüyordu.
 * Navbar Webflow Component'ine çevrilince code component'i olmayan sayfalar
 * runtime'sız kaldı ve o sayfalardan yapılan geçişler bozuldu.
 *
 * KULLANIM
 * --------
 * Bu component'in TEK bir instance'ı kalıcı katmana konur — Barba
 * container'ının DIŞINDA, her sayfada bulunan bir yere (section__footer
 * Webflow Component'inin içi ideal). Tek instance yeter; sayfa başına birden
 * fazla koymanın faydası yok.
 *
 * Bu KALICI bir çözüm değil, bir köprü: doğrusu container içindeki code
 * component'leri vanilla js/ modülüne çevirmek (bkz. PROJECT.md Kural B1).
 */

export interface RuntimeAnchorProps {
  attributes?: Record<string, string>;
}

export function RuntimeAnchor({ attributes }: RuntimeAnchorProps) {
  return (
    <span
      data-mt-runtime-anchor=""
      aria-hidden="true"
      style={{ display: "none" }}
      {...attributes}
    />
  );
}

export default RuntimeAnchor;

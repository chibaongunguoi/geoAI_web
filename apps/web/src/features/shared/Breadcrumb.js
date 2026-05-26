import Link from "next/link";

/**
 * Breadcrumb navigation component for showing page hierarchy.
 * Used on Admin pages to indicate current location within the admin section.
 *
 * @param {{ items: Array<{ label: string, href?: string }> }} props
 * @returns {JSX.Element}
 */
export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href || item.label} className="breadcrumb__item">
              {!isLast && item.href ? (
                <>
                  <Link href={item.href} className="breadcrumb__link">
                    {item.label}
                  </Link>
                  <span className="breadcrumb__separator" aria-hidden="true">
                    /
                  </span>
                </>
              ) : (
                <span className="breadcrumb__current" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

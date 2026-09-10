/**
 * SEO Utility for dynamic page title, meta description, and open graph tag updates
 */

export const updatePageSEO = ({
    title = 'Vishnu Pass - Digital Student ID & Campus Gate Pass System',
    description = 'Secure digital identification and campus gate pass authorization system for Vishnu Institute of Technology.',
    canonicalUrl = window.location.href,
    image = 'https://vishnupass.dpdns.org/vishnu-logo.png'
} = {}) => {
    if (typeof document === 'undefined') return;

    // Update document title
    document.title = title;

    // Helper to update or create meta tags
    const setMetaTag = (attributeName, attributeValue, content) => {
        if (!content) return;
        let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attributeName, attributeValue);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    };

    // Primary Meta Tags
    setMetaTag('name', 'title', title);
    setMetaTag('name', 'description', description);

    // Open Graph Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', image);

    // Twitter Tags
    setMetaTag('property', 'twitter:title', title);
    setMetaTag('property', 'twitter:description', description);
    setMetaTag('property', 'twitter:url', canonicalUrl);
    setMetaTag('property', 'twitter:image', image);

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
};

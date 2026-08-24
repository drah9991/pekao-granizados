import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
}

export function useSEO({ title, description }: SEOProps) {
  useEffect(() => {
    // Save original title
    const previousTitle = document.title;
    
    // Set new title
    document.title = title;

    // Set meta description if provided
    let metaDescription = document.querySelector('meta[name="description"]');
    let previousDescription = '';
    
    if (description) {
      if (metaDescription) {
        previousDescription = metaDescription.getAttribute('content') || '';
        metaDescription.setAttribute('content', description);
      } else {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        metaDescription.setAttribute('content', description);
        document.head.appendChild(metaDescription);
      }
    }

    return () => {
      // Restore previous title
      document.title = previousTitle;
      
      // Restore previous description
      if (description && metaDescription) {
        if (previousDescription) {
          metaDescription.setAttribute('content', previousDescription);
        } else {
          document.head.removeChild(metaDescription);
        }
      }
    };
  }, [title, description]);
}

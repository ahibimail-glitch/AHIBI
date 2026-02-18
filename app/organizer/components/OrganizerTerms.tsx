'use client';

import TermsDisplay from '@/components/TermsDisplay';

interface OrganizerTermsProps {
  className?: string;
}

const OrganizerTerms: React.FC<OrganizerTermsProps> = ({ className = '' }) => {
  return <TermsDisplay category="organizer" className={className} />;
};

export default OrganizerTerms;

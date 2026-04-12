import { CriticalBanner } from './CriticalBanner';
import { BlockingModal } from './BlockingModal';

export const AlertManager = () => {
  return (
    <>
      <CriticalBanner />
      <BlockingModal />
      {/* Space for future global alerts like network loss overlay */}
    </>
  );
};

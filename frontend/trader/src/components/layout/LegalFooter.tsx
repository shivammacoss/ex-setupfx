'use client';

const LEGAL_LINKS = [
  'Client Agreement',
  'General Business Terms',
  'Partnership Agreement',
  'Bonus terms and Conditions',
  'Confidentiality Policy',
  'Key Facts Statement',
  'Conflicts of Interest',
  'Privacy Agreement',
  'Risk Disclosure',
  'Preventing Money Laundering',
  'Complaints Handling Policy',
  'Contact',
];

export default function LegalFooter() {
  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 mt-10 pt-8 pb-10 border-t border-border-primary">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3 text-[12px] text-text-tertiary leading-relaxed">
          <p>
            StockPip (SC) LTD is a Securities Dealer registered in Seychelles with registration number 8423606-1
            and authorised by the Financial Services Authority (FSA) with licence number SD025. The registered
            office of StockPip (SC) LTD is at 9A CT House, 2nd floor, Providence, Mahe, Seychelles.
          </p>
          <p>
            The information on this website may only be copied with the express written permission of StockPip.
            General Risk Warning: CFDs are leveraged products. Trading in CFDs carries a high level of risk thus
            may not be appropriate for all investors. The investment value can both increase and decrease and
            the investors may lose all their invested capital. Under no circumstances shall the Company have any
            liability to any person or entity for any loss or damage in whole or part caused by, resulting from,
            or relating to any transactions related to CFDs.{' '}
            <a href="#" className="text-[#1e88ff] hover:underline">Learn more</a>
          </p>
          <p>
            StockPip complies with the Payment Card Industry Data Security Standard (PCI DSS) to ensure your
            security and privacy. We conduct regular vulnerability scans and penetration tests in accordance
            with the PCI DSS requirements for our business model.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 text-[13px]">
          {LEGAL_LINKS.map((label) => (
            <a key={label} href="#" className="text-[#1e88ff] hover:underline">
              {label}
            </a>
          ))}
          <p className="pt-4 text-text-tertiary text-[12px]">© 2008 - 2026. StockPip</p>
        </div>
      </div>
      <p className="mt-6 text-[11px] text-text-tertiary/70">3.0.46</p>
    </div>
  );
}

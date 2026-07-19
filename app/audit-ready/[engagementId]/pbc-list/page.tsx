'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { headingFont } from '@/components/site-ui';
import { PbcUploadDropzone } from '@/components/audit-ready/PbcUploadDropzone';
import { PbcRequestList } from '@/components/audit-ready/PbcRequestList';
import { EngagementCostTile } from '@/components/audit-ready/EngagementCostTile';

export default function PbcListPage() {
  const params = useParams<{ engagementId: string }>();
  const engagementId = params?.engagementId ?? '';
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <header>
          <h1 className={`${headingFont} text-2xl font-semibold text-[#ECEBE7]`}>
            PBC Request List
          </h1>
          <p className="mt-1 text-[#A29E93]">
            Upload the auditor&apos;s PBC list. Advisacor parses it, classifies
            each request against the six financial-statement assertions, and
            links matching evidence from your books.
          </p>
        </header>

        <EngagementCostTile engagementId={engagementId} />
        <PbcUploadDropzone
          engagementId={engagementId}
          onParsed={() => setRefreshKey((k) => k + 1)}
        />
        <PbcRequestList engagementId={engagementId} refreshKey={refreshKey} />
      </div>
    </main>
  );
}

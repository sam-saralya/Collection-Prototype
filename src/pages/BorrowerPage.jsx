import React, { useState } from 'react';
import { useUI } from '../store.jsx';
import BorrowerDetail from '../components/BorrowerDetail.jsx';
import { Button, Card, PageHead, ErrorBanner } from '../ui.jsx';
import { getBorrowerDoc } from '../data.js';

export default function BorrowerPage() {
  const { borrowerHandle, closeBorrower } = useUI();
  const [doc] = useState(() => getBorrowerDoc(borrowerHandle));

  const r = doc?.record || doc || {};

  return (
    <div>
      <PageHead
        title={doc ? r.name || doc.name || 'Borrower' : 'Borrower'}
        subtitle={
          doc
            ? [
                `Loan ${r.loanId || doc.loanId || '—'}`,
                doc.refId ? `Ref ${doc.refId}` : null,
                r.district ? `${r.district}${r.state ? ', ' + r.state : ''}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : borrowerHandle
            ? `Ref ${borrowerHandle}`
            : ''
        }
        actions={<Button onClick={closeBorrower}>← Back</Button>}
      />

      {!doc ? (
        <ErrorBanner>This borrower could not be found.</ErrorBanner>
      ) : (
        <Card className="p-[18px]">
          <BorrowerDetail borrower={doc} />
        </Card>
      )}
    </div>
  );
}

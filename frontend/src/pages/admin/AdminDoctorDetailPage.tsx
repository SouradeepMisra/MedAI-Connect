import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  approveDoctor,
  getDoctorDetail,
  getDoctorDocumentBlob,
  rejectDoctor,
  runVerification,
} from '../../api/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';
import type { DoctorDetail } from '../../types';

const VERDICT_BADGE: Record<string, string> = {
  match: 'bg-green-100 text-green-700',
  mismatch: 'bg-red-100 text-red-700',
  uncertain: 'bg-amber-100 text-amber-700',
};

function VerdictBadge({ label, verdict }: { label: string; verdict?: string }) {
  if (!verdict) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_BADGE[verdict] ?? 'bg-slate-100 text-slate-600'}`}>
      {label}: {verdict}
    </span>
  );
}

export function AdminDoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAdminAuth();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentContentType, setDocumentContentType] = useState('');
  const [documentError, setDocumentError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{ loginId: string; temporaryPassword?: string } | null>(
    null
  );

  useEffect(() => {
    if (!id || !token) return;
    getDoctorDetail(token, id)
      .then(({ doctor: fetched }) => setDoctor(fetched))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load doctor'))
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    if (!id || !token) return;
    let objectUrl: string | null = null;

    getDoctorDocumentBlob(token, id)
      .then(({ blob, contentType }) => {
        objectUrl = URL.createObjectURL(blob);
        setDocumentUrl(objectUrl);
        setDocumentContentType(contentType);
      })
      .catch((err) => setDocumentError(err instanceof Error ? err.message : 'Failed to load document'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, token]);

  async function handleRunVerification() {
    if (!id || !token) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const { aiVerification } = await runVerification(token, id);
      setDoctor((prev) => (prev ? { ...prev, aiVerification } : prev));
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  async function handleApprove() {
    if (!id || !token) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      const result = await approveDoctor(token, id);
      setApprovalResult({ loginId: result.doctor.loginId, temporaryPassword: result.temporaryPassword });
      setDoctor((prev) => (prev ? { ...prev, verificationStatus: 'Approved', loginId: result.doctor.loginId } : prev));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleReject() {
    if (!id || !token) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      await rejectDoctor(token, id);
      setDoctor((prev) => (prev ? { ...prev, verificationStatus: 'Rejected' } : prev));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActionSubmitting(false);
    }
  }

  if (loading) return <p className="mx-auto max-w-4xl px-6 py-10 text-sm text-slate-500">Loading...</p>;
  if (loadError) return <p className="mx-auto max-w-4xl px-6 py-10 text-sm text-red-600">{loadError}</p>;
  if (!doctor) return null;

  const aiVerification = doctor.aiVerification;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Dr. {doctor.name}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {doctor.verificationStatus}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Submitted profile */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Submitted Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Registration No.</dt>
              <dd className="text-slate-900">{doctor.registrationNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Degree</dt>
              <dd className="text-slate-900">{doctor.degree}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Specialization</dt>
              <dd className="text-slate-900">{doctor.specialization}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Experience</dt>
              <dd className="text-slate-900">{doctor.experience} yrs</dd>
            </div>
          </dl>
        </div>

        {/* Document */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Uploaded Document</h2>
          {documentError && <p className="mt-3 text-sm text-red-600">{documentError}</p>}
          {!documentError && !documentUrl && <p className="mt-3 text-sm text-slate-500">Loading document...</p>}
          {documentUrl && documentContentType.startsWith('image/') && (
            <img src={documentUrl} alt="Uploaded registration document" className="mt-3 max-h-64 w-full rounded-md border border-slate-200 object-contain" />
          )}
          {documentUrl && !documentContentType.startsWith('image/') && (
            <a
              href={documentUrl}
              download
              className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
            >
              Download document
            </a>
          )}
        </div>
      </div>

      {/* AI Verification */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">AI Document Verification</h2>
          <button
            type="button"
            onClick={handleRunVerification}
            disabled={verifying}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {verifying ? 'Running...' : aiVerification && aiVerification.status !== 'NotRun' ? 'Re-run Verification' : 'Run AI Verification'}
          </button>
        </div>

        {verifyError && <p className="mt-3 text-sm text-red-600">{verifyError}</p>}

        {(!aiVerification || aiVerification.status === 'NotRun') && !verifying && (
          <p className="mt-3 text-sm text-slate-500">No AI verification has been run yet.</p>
        )}

        {aiVerification?.status === 'Failed' && (
          <p className="mt-3 text-sm text-red-600">{aiVerification.errorMessage}</p>
        )}

        {aiVerification?.status === 'Completed' && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <VerdictBadge label="Name" verdict={aiVerification.nameMatch} />
              <VerdictBadge label="Registration No." verdict={aiVerification.registrationNumberMatch} />
              <VerdictBadge label="Degree" verdict={aiVerification.degreeMatch} />
            </div>
            <dl className="space-y-1 text-slate-600">
              <div>
                <dt className="inline font-medium text-slate-700">Extracted name: </dt>
                <dd className="inline">{aiVerification.extractedName ?? '—'}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-700">Extracted registration no.: </dt>
                <dd className="inline">{aiVerification.extractedRegistrationNumber ?? '—'}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-700">Extracted degree: </dt>
                <dd className="inline">{aiVerification.extractedDegree ?? '—'}</dd>
              </div>
            </dl>
            {aiVerification.concerns && aiVerification.concerns.length > 0 && (
              <div>
                <p className="font-medium text-slate-700">Concerns:</p>
                <ul className="list-disc pl-5 text-slate-600">
                  {aiVerification.concerns.map((concern, i) => (
                    <li key={i}>{concern}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiVerification.summary && (
              <p className="rounded-md bg-slate-50 p-3 text-slate-700">{aiVerification.summary}</p>
            )}
          </div>
        )}
      </div>

      {/* Approve / Reject */}
      {doctor.verificationStatus === 'Pending' && (
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={actionSubmitting}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={actionSubmitting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}

      {approvalResult && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Doctor approved.</p>
          <p className="mt-1">
            Login ID: <span className="font-mono">{approvalResult.loginId}</span>
          </p>
          {approvalResult.temporaryPassword && (
            <p className="mt-1">
              Temporary password: <span className="font-mono">{approvalResult.temporaryPassword}</span>
              <span className="ml-2 text-xs text-green-700">(shown only once — record it now)</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold">
            Upload Financial Reports
          </h1>
  
          <p className="mb-10 text-slate-300 text-lg">
            Upload QuickBooks financial exports to generate AI-powered
            reporting packages and KPI dashboards.
          </p>
  
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-10">
            <div className="mb-8">
              <label className="mb-3 block text-lg font-semibold">
                Profit & Loss Report
              </label>
  
              <input
                type="file"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4"
              />
            </div>
  
            <div className="mb-8">
              <label className="mb-3 block text-lg font-semibold">
                Balance Sheet
              </label>
  
              <input
                type="file"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4"
              />
            </div>
  
            <div className="mb-10">
              <label className="mb-3 block text-lg font-semibold">
                AR Aging Report
              </label>
  
              <input
                type="file"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4"
              />
            </div>
  
            <button className="w-full rounded-2xl bg-blue-600 px-8 py-4 text-lg font-semibold transition hover:bg-blue-500">
              Generate Financial Package
            </button>
          </div>
        </div>
      </main>
    );
  }
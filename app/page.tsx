export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <div className="max-w-4xl">
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">
            AI-Powered Financial Reporting for Bookkeepers
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-300 md:text-xl">
            Automate client financial packages, KPI dashboards, and AI-generated
            executive commentary directly from QuickBooks.
          </p>

          <button className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold transition hover:bg-blue-500">
            Start Free Trial
          </button>
        </div>
      </section>

      <section className="grid gap-6 px-6 pb-24 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-900 p-6 shadow-lg">
          <h3 className="mb-3 text-xl font-semibold">
            Automated Financial Packages
          </h3>
          <p className="text-slate-400">
            Generate polished monthly reporting packages in minutes.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6 shadow-lg">
          <h3 className="mb-3 text-xl font-semibold">
            AI Executive Commentary
          </h3>
          <p className="text-slate-400">
            Automatically explain trends, risks, and performance changes.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6 shadow-lg">
          <h3 className="mb-3 text-xl font-semibold">
            Real-Time KPI Dashboards
          </h3>
          <p className="text-slate-400">
            Monitor revenue, margins, cash flow, and AR aging instantly.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6 shadow-lg">
          <h3 className="mb-3 text-xl font-semibold">
            Client Reporting Automation
          </h3>
          <p className="text-slate-400">
            Save hours every month with automated reporting workflows.
          </p>
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto max-w-5xl rounded-3xl bg-slate-900 p-12">
          <h2 className="mb-10 text-center text-4xl font-bold">
            How It Works
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-800 p-6">
              <h3 className="mb-3 text-2xl font-semibold">
                Step 1
              </h3>
              <p className="text-slate-300">
                Connect QuickBooks and import financial data.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-800 p-6">
              <h3 className="mb-3 text-2xl font-semibold">
                Step 2
              </h3>
              <p className="text-slate-300">
                Generate AI-powered financial insights and KPI summaries.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-800 p-6">
              <h3 className="mb-3 text-2xl font-semibold">
                Step 3
              </h3>
              <p className="text-slate-300">
                Deliver branded client-ready financial reports automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
import QRCodeWizard from "@/components/dashboard/QRCodeWizard";

export default function WizardQaPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <QRCodeWizard />
      </div>
    </main>
  );
}

import { ExcelExplorer } from './components/ExcelExplorer';

export default function App() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Decorative background element */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>
      
      <main className="relative">
        <ExcelExplorer />
      </main>
      
      <footer className="py-12 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground italic font-serif">
            Processed locally in your browser. Your data never leaves your device.
          </p>
        </div>
      </footer>
    </div>
  );
}


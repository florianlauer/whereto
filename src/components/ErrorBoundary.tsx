import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white">
          <div className="text-center">
            <p className="text-lg font-medium">
              Impossible de charger les données. Rechargez la page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-green-600 px-4 py-2 text-sm hover:bg-green-700"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

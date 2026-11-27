import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last line of defence: if a render ever throws, the app shows a readable
 * message with a reload button instead of React unmounting into a blank page.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Leftweeks render error", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-base font-bold text-slate-900">
            화면을 표시하는 중 문제가 생겼습니다
          </h1>
          <p className="mt-2 text-xs text-slate-600">
            저장된 차트는 그대로 남아 있습니다. 아래 버튼으로 다시 불러와 주세요.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Something went wrong while drawing the chart. Your saved chart is
            untouched — reload to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
          >
            다시 불러오기 / Reload
          </button>
        </div>
      </div>
    );
  }
}

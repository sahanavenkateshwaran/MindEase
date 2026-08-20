import React from 'react';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MindEase page failed to render:', error, errorInfo);
  }

  returnToSignIn = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.assign('/auth');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b13] px-4 flex items-center justify-center text-gray-100">
          <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111928] p-8 text-center shadow-2xl">
            <span className="material-icons text-4xl text-cyan-400">spa</span>
            <h1 className="mt-4 text-xl font-bold">We couldn’t open your workspace</h1>
            <p className="mt-2 text-sm text-gray-400">Please sign in again to start a fresh session.</p>
            <button type="button" onClick={this.returnToSignIn} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3 font-semibold text-white">
              Return to sign in
            </button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Protege um bloco da página: se ele quebrar, só ele some, em vez de a tela inteira cair no ErrorBoundary.
 * O erro vai para o console com o nome do bloco, para a gente achar a causa.
 */
export class SafeSection extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`12axes: a seção "${this.props.name}" quebrou e foi escondida`, error, info.componentStack);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

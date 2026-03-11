"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="m-4 border-destructive/20 bg-destructive/5 shadow-none overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2 text-base font-black">
              <AlertCircle className="size-5" aria-hidden="true" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
              There was an error loading this component. Try refreshing the page or try again.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-full font-black px-6 shadow-lg shadow-destructive/20 gap-2"
              onClick={() => this.setState({ hasError: false })}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

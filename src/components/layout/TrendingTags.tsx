"use client";

import React, { Fragment } from "react";
import { useTrending } from "@/hooks/useTrending";
import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const TrendingTags = () => {
  const { trending, loading, error } = useTrending();

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M notes`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K notes`;
    return `${n} notes`;
  };

  if (error) return null;

  return (
    <Card className="rounded-3xl border-none shadow-none bg-muted/30">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-xl font-black">
          <TrendingUp className="size-5 text-primary" />
          Trending
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <Fragment key={i}>
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                {i < 3 && <Separator className="bg-muted-foreground/10" />}
              </Fragment>
            ))}
          </div>
        ) : trending.length > 0 ? (
          <div className="flex flex-col">
            {trending.slice(0, 5).map((item, index) => (
              <Fragment key={item.tag}>
                <Link 
                  href={`/search?q=${encodeURIComponent('#' + item.tag)}`}
                  className="block p-4 hover:bg-accent/50 transition-colors group"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                    Trending
                  </p>
                  <p className="font-black text-base">
                    #{item.tag}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCount(item.count)}
                  </p>
                </Link>
                {index < Math.min(trending.length, 5) - 1 && <Separator className="bg-muted-foreground/10" />}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground italic text-sm">
            No trends found right now.
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-0 border-t border-muted-foreground/10">
        <Button asChild variant="ghost" className="w-full justify-start p-4 text-primary font-black hover:bg-accent/50 rounded-none h-auto">
          <Link href="/search" className="flex items-center justify-between w-full group">
            Show more
            <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

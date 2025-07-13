"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { harmonizeColors, HarmonizeColorsOutput } from "@/ai/flows/color-harmonizer";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const FormSchema = z.object({
  baseColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, { message: "Must be a valid hex color code (e.g., #4A148C)" }),
});

interface ColorHarmonizerPanelProps {
  onApplyPalette: (colors: string[]) => void;
}

export default function ColorHarmonizerPanel({ onApplyPalette }: ColorHarmonizerPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HarmonizeColorsOutput | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      baseColor: "#663399",
    },
  });
  
  const watchedColor = form.watch("baseColor");

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await harmonizeColors(data);
      setResult(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate color palette. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleApply = () => {
    if (result) {
      const allColors = [form.getValues("baseColor"), ...result.harmonizedColors];
      onApplyPalette(allColors);
      toast({
        title: "Success!",
        description: "New color palette has been applied to the planets.",
      });
    }
  };

  return (
    <div className="py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Palette</CardTitle>
          <CardDescription>Enter a base color to generate a new palette.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="baseColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Color (Hex)</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder="#663399" {...field} />
                      </FormControl>
                      <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: FormSchema.shape.baseColor.safeParse(watchedColor).success ? watchedColor : 'transparent' }} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Generating..." : "Generate"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && <LoadingState />}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Palette</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{result.explanation}</p>
            <div className="flex flex-wrap gap-2">
              <div
                className="w-10 h-10 rounded-md border-2 border-primary"
                style={{ backgroundColor: form.getValues("baseColor") }}
              />
              {result.harmonizedColors.map((color, index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-md border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleApply} className="w-full">Apply Palette</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

function LoadingState() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex flex-wrap gap-2 pt-2">
                    <Skeleton className="w-10 h-10 rounded-md" />
                    <Skeleton className="w-10 h-10 rounded-md" />
                    <Skeleton className="w-10 h-10 rounded-md" />
                    <Skeleton className="w-10 h-10 rounded-md" />
                    <Skeleton className="w-10 h-10 rounded-md" />
                </div>
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    )
}

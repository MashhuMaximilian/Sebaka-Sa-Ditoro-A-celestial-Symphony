// src/ai/flows/color-harmonizer.ts
'use server';

/**
 * @fileOverview A color harmonization AI agent.
 *
 * - harmonizeColors - A function that takes a color as input and returns a harmonious color palette.
 * - HarmonizeColorsInput - The input type for the harmonizeColors function.
 * - HarmonizeColorsOutput - The return type for the harmonizeColors function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HarmonizeColorsInputSchema = z.object({
  baseColor: z
    .string() /*.regex(/^#([0-9A-Fa-f]{3}){1,2}$/)*/
    .describe('The base color in hex format (e.g., #4A148C).'),
});
export type HarmonizeColorsInput = z.infer<typeof HarmonizeColorsInputSchema>;

const HarmonizeColorsOutputSchema = z.object({
  harmonizedColors: z
    .array(z.string()/*.regex(/^#([0-9A-Fa-f]{3}){1,2}$/)*/)
    .describe('An array of harmonized colors in hex format.'),
  explanation: z
    .string()
    .describe('Explanation of why the colors are harmonious'),
});
export type HarmonizeColorsOutput = z.infer<typeof HarmonizeColorsOutputSchema>;

export async function harmonizeColors(input: HarmonizeColorsInput): Promise<HarmonizeColorsOutput> {
  return harmonizeColorsFlow(input);
}

const harmonizeColorsPrompt = ai.definePrompt({
  name: 'harmonizeColorsPrompt',
  input: {schema: HarmonizeColorsInputSchema},
  output: {schema: HarmonizeColorsOutputSchema},
  prompt: `You are an expert color palette generator, skilled in the art of color theory.
  Given a base color, generate a palette of 4 additional colors that harmonize well with the base color.
  Explain your reasoning for choosing the provided colors in terms of color theory (e.g., complementary, analogous, triadic, etc.).
  Return the colors in hex format.

  Base Color: {{{baseColor}}}
  `,
});

const harmonizeColorsFlow = ai.defineFlow(
  {
    name: 'harmonizeColorsFlow',
    inputSchema: HarmonizeColorsInputSchema,
    outputSchema: HarmonizeColorsOutputSchema,
  },
  async input => {
    const {output} = await harmonizeColorsPrompt(input);
    return output!;
  }
);

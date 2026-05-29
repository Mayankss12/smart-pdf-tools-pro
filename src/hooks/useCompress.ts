"use client";
import { useState } from "react";
export type CompressionLevel="low"|"medium"|"high";
export type CompressResult={blob:Blob;url:string;fileName:string;originalSize:number;compressedSize:number;savedBytes:number;savedPercent:number;method:string};
export function useCompress(){const[isLoading,setIsLoading]=useState(false);const[progress,setProgress]=useState(0);const[result,setResult]=useState<CompressResult|null>(null);const[error,setError]=useState<string|null>(null);function reset(){if(result?.url)URL.revokeObjectURL(result.url);setIsLoading(false);setProgress(0);setResult
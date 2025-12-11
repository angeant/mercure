"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, X, ArrowLeft, Sparkles, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface AnalysisData {
  deliveryNoteNumber: string | null;
  date: string | null;
  // Remitente
  senderId: number | null;
  senderName: string | null;
  senderCuit: string | null;
  senderAddress: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  // Destinatario
  recipientId: number | null;
  recipientName: string | null;
  recipientCuit: string | null;
  recipientAddress: string | null;
  recipientLocality: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  // Carga
  packageQuantity: number | null;
  weightKg: number | null;
  volumeM3: number | null;
  declaredValue: number | null;
  loadDescription: string | null;
  observations: string | null;
}

interface FormData {
  // Remito
  deliveryNoteNumber: string;
  date: string;
  // Carga (lo más importante)
  packageQuantity: string;
  weightKg: string;
  volumeM3: string;
  declaredValue: string;
  // Remitente (solo referencia)
  senderName: string;
  senderId: number | null;
  // Destinatario (cliente principal)
  recipientId: number | null;
  recipientName: string;
  recipientCuit: string;
  recipientAddress: string;
  recipientLocality: string;
  recipientPhone: string;
  recipientEmail: string;
  // Condiciones de pago
  paidBy: 'origen' | 'destino'; // Pagadero por origen (remitente) o destino (destinatario)
  paymentTerms: string; // contado, cuenta_corriente
  // Extras
  loadDescription: string;
  observations: string;
}

// Campos que necesitan confirmación (no se pudieron extraer automáticamente)
interface PendingFields {
  packageQuantity: boolean;
  weightKg: boolean;
  volumeM3: boolean;
  declaredValue: boolean;
  recipientAddress: boolean;
}

interface EntityMatch {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
}

type RecipientStatus = 'pending' | 'found' | 'not_found' | 'new';

export default function NuevaRecepcionPage() {
  const [remitoImage, setRemitoImage] = useState<File | null>(null);
  const [remitoPreview, setRemitoPreview] = useState<string | null>(null);
  const [cargaImage, setCargaImage] = useState<File | null>(null);
  const [cargaPreview, setCargaPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thinkingText, setThinkingText] = useState<string>("");
  const [needsReview, setNeedsReview] = useState<Record<string, boolean>>({});
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});

  // Estado para destinatario (cliente)
  const [recipientStatus, setRecipientStatus] = useState<RecipientStatus>('pending');
  const [recipientSuggestions, setRecipientSuggestions] = useState<EntityMatch[]>([]);
  
  // Estado para remitente (simple, solo para mostrar si se encontró)
  const [senderStatus, setSenderStatus] = useState<'pending' | 'found'>('pending');

  // Estado para pricing (árbol de decisión A/B/C)
  interface PricingInfo {
    path: 'A' | 'B' | 'C';
    pathName: string;
    tag: { color: 'green' | 'yellow' | 'red'; label: string; description: string };
    pricing: { 
      source: string; 
      price: number | null; 
      quotationId?: number;
      breakdown?: Record<string, number>;
    };
    validation?: { needsReview: boolean; reason?: string };
    commercialTerms?: {
      tariffType: string;
      tariffModifier: number;
      insuranceRate: number;
      creditDays?: number;
    };
  }
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  
  // Campos que necesitan confirmación
  const [pendingFields, setPendingFields] = useState<PendingFields>({
    packageQuantity: false,
    weightKg: false,
    volumeM3: false,
    declaredValue: false,
    recipientAddress: false,
  });

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    // Remito
    deliveryNoteNumber: "",
    date: new Date().toISOString().split("T")[0],
    // Carga
    packageQuantity: "",
    weightKg: "",
    volumeM3: "",
    declaredValue: "",
    // Remitente
    senderName: "",
    senderId: null,
    // Destinatario
    recipientId: null,
    recipientName: "",
    recipientCuit: "",
    recipientAddress: "",
    recipientLocality: "",
    recipientPhone: "",
    recipientEmail: "",
    // Condiciones de pago
    paidBy: 'destino', // Por defecto paga el destinatario
    paymentTerms: "contado",
    // Extras
    loadDescription: "",
    observations: "",
  });
  
  // Marcar campo como confirmado (quitar el rojo)
  const confirmField = (field: keyof PendingFields) => {
    setPendingFields(prev => ({ ...prev, [field]: false }));
  };
  
  // Estilo para campos pendientes
  const getFieldClassName = (field: keyof PendingFields, baseClass: string = "h-8 text-sm") => {
    if (pendingFields[field]) {
      return `${baseClass} border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200`;
    }
    return baseClass;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    ).slice(0, 2); // Máximo 2 imágenes

    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (index === 0) {
          // Primera imagen -> Remito
          setRemitoImage(file);
          setRemitoPreview(reader.result as string);
        } else if (index === 1) {
          // Segunda imagen -> Carga
          setCargaImage(file);
          setCargaPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const removeImage = (type: "remito" | "carga") => {
    if (type === "remito") {
      setRemitoImage(null);
      setRemitoPreview(null);
    } else {
      setCargaImage(null);
      setCargaPreview(null);
    }
  };

  const swapImages = () => {
    const tempImage = remitoImage;
    const tempPreview = remitoPreview;
    setRemitoImage(cargaImage);
    setRemitoPreview(cargaPreview);
    setCargaImage(tempImage);
    setCargaPreview(tempPreview);
  };

  // Buscar entidad por CUIT o nombre
  const searchEntity = async (cuit: string | null, name: string | null): Promise<{
    found: boolean;
    entity?: EntityMatch;
    suggestions?: EntityMatch[];
  }> => {
    const params = new URLSearchParams();
    if (cuit) params.append('cuit', cuit);
    if (name) params.append('name', name);

    const response = await fetch(`/api/search-entity?${params.toString()}`);
    const result = await response.json();
    return result;
  };

  // Seleccionar un destinatario de las sugerencias
  const selectRecipient = (entity: EntityMatch) => {
    setFormData(prev => ({
      ...prev,
      recipientId: entity.id,
      recipientName: entity.legal_name,
      recipientCuit: entity.tax_id || '',
      recipientAddress: entity.address || '',
    }));
    setRecipientStatus('found');
    setRecipientSuggestions([]);
    // Detectar pricing cuando se selecciona cliente
    detectPricing(entity.tax_id || undefined, entity.legal_name);
  };

  // Detectar camino de pricing (A/B/C)
  const detectPricing = async (cuit?: string, name?: string, forceRecalc = false) => {
    // Solo recalcular si tenemos cliente y datos de carga
    const hasCargo = formData.weightKg || formData.volumeM3 || formData.declaredValue;
    const hasClient = cuit || name || formData.recipientCuit || formData.recipientName;
    
    if (!hasClient && !forceRecalc) return;

    try {
      const response = await fetch('/api/detect-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientCuit: cuit || formData.recipientCuit,
          recipientName: name || formData.recipientName,
          destination: formData.recipientAddress || formData.recipientLocality,
          packageQuantity: formData.packageQuantity ? parseInt(formData.packageQuantity) : undefined,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
          volumeM3: formData.volumeM3 ? parseFloat(formData.volumeM3) : undefined,
          declaredValue: formData.declaredValue ? parseFloat(formData.declaredValue) : undefined,
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setPricingInfo(result);
        if (result.pricing?.price) {
          setCalculatedPrice(result.pricing.price);
        } else {
          setCalculatedPrice(null);
        }
      }
    } catch (error) {
      console.error('Error detecting pricing:', error);
    }
  };

  // Recalcular precio cuando cambian datos de carga (con debounce)
  useEffect(() => {
    if (recipientStatus !== 'found') return;
    
    const timer = setTimeout(() => {
      detectPricing();
    }, 500); // Debounce de 500ms
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.weightKg, formData.volumeM3, formData.declaredValue]);

  const analyzeImages = async () => {
    if (!remitoImage && !cargaImage) {
      setError("Cargá al menos una imagen para analizar");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setThinkingText("");
    setNeedsReview({});
    setReviewReasons({});
    setRecipientStatus('pending');
    setSenderStatus('pending');

    try {
      const formDataToSend = new FormData();
      if (remitoImage) formDataToSend.append("remito", remitoImage);
      if (cargaImage) formDataToSend.append("carga", cargaImage);

      const response = await fetch("/api/analyze-reception", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al analizar las imágenes");
      }

      // Procesar el stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let data: AnalysisData | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;
                
                const event = JSON.parse(jsonStr);
                
                if (event.type === 'thinking') {
                  setThinkingText(prev => prev + event.text);
                } else if (event.type === 'text') {
                  // Ignorar el text incremental, usamos complete
                } else if (event.type === 'complete') {
                  data = event.data;
                  console.log('Análisis completo:', data);
                } else if (event.type === 'error') {
                  console.error('Error del stream:', event.error);
                  throw new Error(event.error);
                }
              } catch (e) {
                // Solo ignorar errores de parsing, no errores reales
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      }

      if (!data) {
        throw new Error("No se recibieron datos del análisis");
      }

      // Actualizar el formulario con los datos extraídos
      setFormData((prev) => ({
        ...prev,
        deliveryNoteNumber: data!.deliveryNoteNumber || prev.deliveryNoteNumber,
        date: data!.date || prev.date,
        // Carga
        packageQuantity: data!.packageQuantity?.toString() || prev.packageQuantity,
        weightKg: data!.weightKg?.toString() || prev.weightKg,
        volumeM3: (data as any).volumeM3?.toString() || prev.volumeM3,
        declaredValue: data!.declaredValue?.toString() || prev.declaredValue,
        // Remitente (solo nombre)
        senderId: data!.senderId || prev.senderId,
        senderName: data!.senderName || prev.senderName,
        // Destinatario
        recipientId: data!.recipientId || prev.recipientId,
        recipientName: data!.recipientName || prev.recipientName,
        recipientCuit: data!.recipientCuit || prev.recipientCuit,
        recipientAddress: data!.recipientAddress || prev.recipientAddress,
        recipientLocality: data!.recipientLocality || prev.recipientLocality,
        recipientPhone: data!.recipientPhone || prev.recipientPhone,
        recipientEmail: data!.recipientEmail || prev.recipientEmail,
        // Extras
        loadDescription: data!.loadDescription || prev.loadDescription,
        observations: data!.observations || prev.observations,
      }));
      
      // Marcar campos críticos que no se pudieron extraer
      setPendingFields({
        packageQuantity: !data.packageQuantity,
        weightKg: !data.weightKg,
        volumeM3: !(data as any).volumeM3,
        declaredValue: !data.declaredValue,
        recipientAddress: !data.recipientAddress,
      });

      // Guardar campos que necesitan revisión y sus razones
      if ((data as any).needsReview) {
        setNeedsReview((data as any).needsReview);
      }
      if ((data as any).reviewReasons) {
        setReviewReasons((data as any).reviewReasons);
      }

      // Si el LLM devolvió IDs, marcar como encontrado directamente
      if (data.recipientId) {
        setRecipientStatus('found');
        // Detectar pricing
        detectPricing(data.recipientCuit, data.recipientName);
      } else if (data.recipientName || data.recipientCuit) {
        // Buscar en DB si no devolvió ID
        const recipientResult = await searchEntity(data.recipientCuit, data.recipientName);
        
        if (recipientResult.found && recipientResult.entity) {
          setFormData(prev => ({
            ...prev,
            recipientId: recipientResult.entity!.id,
            recipientName: recipientResult.entity!.legal_name,
            recipientCuit: recipientResult.entity!.tax_id || prev.recipientCuit,
            recipientAddress: recipientResult.entity!.address || prev.recipientAddress,
          }));
          setRecipientStatus('found');
          // Detectar pricing
          detectPricing(recipientResult.entity!.tax_id || undefined, recipientResult.entity!.legal_name);
        } else if (recipientResult.suggestions && recipientResult.suggestions.length > 0) {
          setRecipientSuggestions(recipientResult.suggestions);
          setRecipientStatus('not_found');
        } else {
          setRecipientStatus('not_found');
        }
      }

      // Remitente: solo marcar si encontró ID (no es crítico)
      if (data.senderId) {
        setSenderStatus('found');
      } else {
        setSenderStatus('pending'); // No importa mucho si no lo encuentra
      }

      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Validar campos críticos
      if (!formData.recipientName?.trim()) {
        throw new Error("El destinatario es requerido");
      }
      
      if (!formData.packageQuantity) {
        setPendingFields(prev => ({ ...prev, packageQuantity: true }));
        throw new Error("La cantidad de bultos es requerida");
      }
      
      if (!formData.declaredValue) {
        setPendingFields(prev => ({ ...prev, declaredValue: true }));
        throw new Error("El valor declarado es requerido");
      }
      
      if (!formData.recipientAddress?.trim()) {
        setPendingFields(prev => ({ ...prev, recipientAddress: true }));
        throw new Error("La dirección de entrega es requerida");
      }

      // Preparar FormData para enviar
      const formDataToSend = new FormData();
      formDataToSend.append("data", JSON.stringify(formData));
      if (remitoImage) formDataToSend.append("remito", remitoImage);
      if (cargaImage) formDataToSend.append("carga", cargaImage);

      const response = await fetch("/api/save-reception", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al guardar la recepción");
      }

      // Redirigir a la lista de recepciones
      window.location.href = "/recepcion";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-3 mb-4">
            <Link href="/recepcion">
              <Button variant="ghost" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-medium text-neutral-900">
              Nueva Recepción
            </h1>
          </div>

          {/* Zona de Drop Unificada */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            
            {/* Si no hay imágenes, mostrar zona de drop grande */}
            {!remitoPreview && !cargaPreview ? (
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center p-8 rounded border-2 border-dashed cursor-pointer transition-colors
                  ${isDragging 
                    ? 'border-orange-400 bg-orange-50' 
                    : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400'
                  }
                `}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-neutral-500" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-neutral-500" />
                  </div>
                </div>
                <p className="text-sm font-medium text-neutral-700 mb-1">
                  Arrastrá las fotos del remito y la carga
                </p>
                <p className="text-xs text-neutral-500">
                  O hacé click para seleccionar (máximo 2 imágenes)
                </p>
              </div>
            ) : (
              /* Si hay imágenes, mostrar previews con zona de drop reducida */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Remito */}
                  <div className="border border-neutral-200 rounded p-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        Remito
                      </span>
                      <div className="flex items-center gap-1">
                        {remitoPreview && cargaPreview && (
                          <button
                            onClick={swapImages}
                            className="text-xs text-neutral-400 hover:text-neutral-600 px-1"
                            title="Intercambiar"
                          >
                            ⇄
                          </button>
                        )}
                        {remitoPreview && (
                          <button
                            onClick={() => removeImage("remito")}
                            className="text-neutral-400 hover:text-neutral-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {remitoPreview ? (
                      <div className="relative aspect-[4/3] bg-neutral-100 rounded overflow-hidden">
                        <img
                          src={remitoPreview}
                          alt="Remito"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center aspect-[4/3] bg-neutral-50 rounded border border-dashed border-neutral-200 cursor-pointer hover:bg-neutral-100"
                      >
                        <Camera className="h-5 w-5 text-neutral-400 mb-1" />
                        <span className="text-xs text-neutral-400">Agregar</span>
                      </div>
                    )}
                  </div>

                  {/* Carga */}
                  <div className="border border-neutral-200 rounded p-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        Carga
                      </span>
                      {cargaPreview && (
                        <button
                          onClick={() => removeImage("carga")}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {cargaPreview ? (
                      <div className="relative aspect-[4/3] bg-neutral-100 rounded overflow-hidden">
                        <img
                          src={cargaPreview}
                          alt="Carga"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center aspect-[4/3] bg-neutral-50 rounded border border-dashed border-neutral-200 cursor-pointer hover:bg-neutral-100"
                      >
                        <ImageIcon className="h-5 w-5 text-neutral-400 mb-1" />
                        <span className="text-xs text-neutral-400">Agregar</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zona de drop adicional pequeña */}
                {(!remitoPreview || !cargaPreview) && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      p-2 rounded border border-dashed text-center text-xs transition-colors
                      ${isDragging 
                        ? 'border-orange-400 bg-orange-50 text-orange-600' 
                        : 'border-neutral-200 text-neutral-400'
                      }
                    `}
                  >
                    {isDragging ? 'Soltá aquí' : 'Arrastrá más imágenes aquí'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botón analizar */}
          <div className="mb-6">
            <Button
              onClick={analyzeImages}
              disabled={isAnalyzing || (!remitoImage && !cargaImage)}
              className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando imágenes...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analizar con IA
                </>
              )}
            </Button>
            
            {/* Panel de Thinking */}
            {isAnalyzing && thinkingText && (
              <div className="mt-3 p-3 bg-neutral-900 rounded border border-neutral-700 max-h-48 overflow-y-auto" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    Kalia está pensando...
                  </span>
                </div>
                <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {thinkingText}
                </pre>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {analyzed && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✓ Análisis completado. Verificá los datos y completá los faltantes.
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            <div className="border border-neutral-200 rounded overflow-hidden">
              {/* Datos del remito */}
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Datos del Remito
                </span>
              </div>
              <div className="p-3 grid grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Nº Remito</Label>
                  <Input
                    name="deliveryNoteNumber"
                    value={formData.deliveryNoteNumber}
                    onChange={handleInputChange}
                    className="h-8 text-sm"
                    placeholder="0001-00000123"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Fecha</Label>
                  <Input
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    Bultos
                    {pendingFields.packageQuantity && <span className="text-red-500">*</span>}
                    {needsReview.packageQuantity && formData.packageQuantity && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <Input
                    name="packageQuantity"
                    type="number"
                    value={formData.packageQuantity}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value) {
                        confirmField('packageQuantity');
                        setNeedsReview(prev => ({ ...prev, packageQuantity: false }));
                      }
                    }}
                    className={`${getFieldClassName('packageQuantity')} ${needsReview.packageQuantity ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="Requerido"
                  />
                  {needsReview.packageQuantity && reviewReasons.packageQuantity && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.packageQuantity}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    Peso (kg)
                    {pendingFields.weightKg && <span className="text-red-500">*</span>}
                    {needsReview.weightKg && formData.weightKg && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <Input
                    name="weightKg"
                    type="number"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value) {
                        confirmField('weightKg');
                        setNeedsReview(prev => ({ ...prev, weightKg: false }));
                      }
                    }}
                    className={`${getFieldClassName('weightKg')} ${needsReview.weightKg ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="Requerido"
                  />
                  {needsReview.weightKg && reviewReasons.weightKg && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.weightKg}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    M³
                    {pendingFields.volumeM3 && <span className="text-red-500">*</span>}
                    {needsReview.volumeM3 && formData.volumeM3 && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <Input
                    name="volumeM3"
                    type="number"
                    step="0.01"
                    value={formData.volumeM3}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value) {
                        confirmField('volumeM3');
                        setNeedsReview(prev => ({ ...prev, volumeM3: false }));
                      }
                    }}
                    className={`${getFieldClassName('volumeM3')} ${needsReview.volumeM3 ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="Requerido"
                  />
                  {needsReview.volumeM3 && reviewReasons.volumeM3 && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.volumeM3}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    Valor Declarado
                    {pendingFields.declaredValue && <span className="text-red-500">*</span>}
                    {needsReview.declaredValue && formData.declaredValue && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                    <Input
                      name="declaredValue"
                      type="number"
                      step="0.01"
                      value={formData.declaredValue}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (e.target.value) {
                          confirmField('declaredValue');
                          setNeedsReview(prev => ({ ...prev, declaredValue: false }));
                        }
                      }}
                      className={`${getFieldClassName('declaredValue')} pl-5 ${needsReview.declaredValue ? 'border-amber-300 bg-amber-50' : ''}`}
                      placeholder="Requerido"
                    />
                  </div>
                  {needsReview.declaredValue && reviewReasons.declaredValue && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.declaredValue}
                    </p>
                  )}
                </div>
              </div>

              {/* Remitente (simple) */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Origen / Remitente
                </span>
              </div>
              <div className="p-3">
                <Label className="text-xs mb-1 block">Remitente</Label>
                <Input
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleInputChange}
                  className="h-8 text-sm"
                  placeholder="Nombre de quien envía (opcional)"
                />
              </div>

              {/* Destinatario (Cliente) */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Destino / Cliente
                </span>
                <div className="flex items-center gap-2">
                  {recipientStatus === 'found' && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Existente
                    </span>
                  )}
                  {/* TAG de Pricing */}
                  {pricingInfo && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      pricingInfo.tag.color === 'green' 
                        ? 'bg-green-100 text-green-800' 
                        : pricingInfo.tag.color === 'yellow'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {pricingInfo.tag.label}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Alerta de pricing (simplificada) */}
              {pricingInfo && (
                <div className={`px-3 py-1.5 border-b text-xs ${
                  pricingInfo.tag.color === 'green' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : pricingInfo.tag.color === 'yellow'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {pricingInfo.tag.description}
                  {pricingInfo.validation?.needsReview && pricingInfo.validation.reason && (
                    <span className="ml-2 font-medium">⚠️ {pricingInfo.validation.reason}</span>
                  )}
                </div>
              )}
              
              {/* Sugerencias de destinatario */}
              {recipientStatus === 'not_found' && recipientSuggestions.length > 0 && (
                <div className="p-3 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-amber-800 font-medium mb-2">
                        ¿Es alguno de estos clientes?
                      </p>
                      <div className="space-y-1">
                        {recipientSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => selectRecipient(s)}
                            className="block w-full text-left px-2 py-1.5 text-xs bg-white rounded border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            <span className="font-medium">{s.legal_name}</span>
                            {s.tax_id && <span className="text-neutral-500 ml-2">CUIT: {s.tax_id}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Cliente / Razón Social</Label>
                    <Input
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                      placeholder="Nombre del cliente"
                      disabled={recipientStatus === 'found'}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Teléfono</Label>
                    <Input
                      name="recipientPhone"
                      value={formData.recipientPhone}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                      placeholder="011-1234-5678"
                      disabled={recipientStatus === 'found'}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block flex items-center gap-1">
                      Dirección de entrega
                      {pendingFields.recipientAddress && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      name="recipientAddress"
                      value={formData.recipientAddress}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (e.target.value) confirmField('recipientAddress');
                      }}
                      className={getFieldClassName('recipientAddress')}
                      placeholder="Calle, número, piso, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Localidad</Label>
                    <Input
                      name="recipientLocality"
                      value={formData.recipientLocality}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                      placeholder="Ciudad / Localidad"
                    />
                  </div>
                </div>
              </div>

              {/* Condiciones de Pago y Pricing */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Condiciones de Pago
                </span>
                {calculatedPrice && calculatedPrice > 0 && (
                  <span className="text-lg font-bold text-neutral-900">
                    ${calculatedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              
              {/* Detalle del cálculo de pricing */}
              {pricingInfo && pricingInfo.pricing.breakdown && (
                <div className="px-3 py-2 bg-neutral-100 border-b border-neutral-200 text-xs">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {/* Columna izquierda: Datos de carga */}
                    <div className="space-y-1">
                      <div className="font-medium text-neutral-600 mb-1">Datos de carga:</div>
                      <div className="flex justify-between">
                        <span>Peso real:</span>
                        <span className="font-mono">{formData.weightKg || 0} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Volumen:</span>
                        <span className="font-mono">{formData.volumeM3 || 0} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso volumétrico (×300):</span>
                        <span className="font-mono">{((parseFloat(formData.volumeM3) || 0) * 300).toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between font-medium text-neutral-800 pt-1 border-t border-neutral-300">
                        <span>Peso a cobrar:</span>
                        <span className="font-mono">
                          {Math.max(
                            parseFloat(formData.weightKg) || 0,
                            (parseFloat(formData.volumeM3) || 0) * 300
                          ).toFixed(1)} kg
                          {(parseFloat(formData.volumeM3) || 0) * 300 > (parseFloat(formData.weightKg) || 0) 
                            ? ' (por volumen)' 
                            : ' (por peso)'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Columna derecha: Desglose de precio */}
                    <div className="space-y-1">
                      <div className="font-medium text-neutral-600 mb-1">Desglose:</div>
                      {Object.entries(pricingInfo.pricing.breakdown).map(([key, value]) => (
                        typeof value === 'number' && (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className={`font-mono ${value < 0 ? 'text-green-700' : ''}`}>
                              {value < 0 ? '-' : ''}${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )
                      ))}
                      <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-300">
                        <span>TOTAL FLETE:</span>
                        <span className="font-mono">${calculatedPrice?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Nota sobre tarifa aplicada */}
                  {pricingInfo.commercialTerms && (
                    <div className="mt-2 pt-2 border-t border-neutral-300 text-neutral-500 flex gap-4">
                      <span>Tarifa: {pricingInfo.commercialTerms.tariffType}</span>
                      {pricingInfo.commercialTerms.tariffModifier !== 0 && (
                        <span className={pricingInfo.commercialTerms.tariffModifier < 0 ? 'text-green-700' : 'text-red-600'}>
                          Descuento: {pricingInfo.commercialTerms.tariffModifier}%
                        </span>
                      )}
                      <span>Seguro: {(pricingInfo.commercialTerms.insuranceRate * 1000).toFixed(1)}‰</span>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Pagadero por</Label>
                  <select
                    name="paidBy"
                    value={formData.paidBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, paidBy: e.target.value as 'origen' | 'destino' }))}
                    className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="destino">Destino (Cliente)</option>
                    <option value="origen">Origen (Remitente)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Condición</Label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="contado">Contado (Contra entrega)</option>
                    <option value="cuenta_corriente">Cuenta Corriente</option>
                  </select>
                </div>
                {formData.paymentTerms === 'contado' && calculatedPrice && (
                  <div className="flex items-end">
                    <div className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm font-bold">
                      COBRAR: ${calculatedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                {pricingInfo?.path === 'A' && (
                  <div className="flex items-end">
                    <div className="px-3 py-1.5 bg-green-100 border border-green-200 rounded text-xs text-green-800">
                      Facturar a fin de mes (Cta Cte)
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción de la carga */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Descripción de la Carga
                </span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Descripción</Label>
                  <textarea
                    name="loadDescription"
                    value={formData.loadDescription}
                    onChange={handleInputChange}
                    className="w-full h-20 px-3 py-2 text-sm border border-neutral-200 rounded resize-none focus:outline-none focus:border-neutral-400"
                    placeholder="Descripción de la mercadería..."
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Observaciones</Label>
                  <textarea
                    name="observations"
                    value={formData.observations}
                    onChange={handleInputChange}
                    className="w-full h-20 px-3 py-2 text-sm border border-neutral-200 rounded resize-none focus:outline-none focus:border-neutral-400"
                    placeholder="Notas sobre el estado de la carga..."
                  />
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 mt-4">
              <Link href="/recepcion">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-sm"
                >
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-8 px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  "Registrar Recepción"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


/**
 * Formularz tworzenia/edycji artykułu OKUC
 *
 * Walidacja:
 * - Co najmniej jedno z (usedInPvc || usedInAlu) musi być true
 * - Wszystkie wymagane pola wypełnione
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OkucArticle, CreateArticleInput, UpdateArticleInput } from '@/types/okuc';

interface ArticleFormProps {
  article?: OkucArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateArticleInput | UpdateArticleInput) => void;
  isPending: boolean;
}

export function ArticleForm({
  article,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ArticleFormProps) {
  const isEditing = !!article;

  // State formularza
  const [formData, setFormData] = useState<CreateArticleInput>({
    articleId: '',
    name: '',
    description: '',
    usedInPvc: true,
    usedInAlu: false,
    orderClass: 'typical',
    sizeClass: 'standard',
    orderUnit: 'piece',
    leadTimeDays: 14,
    safetyDays: 7,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Resetuj formularz przy otwarciu
  useEffect(() => {
    if (open) {
      if (article) {
        setFormData({
          articleId: article.articleId,
          name: article.name,
          description: article.description || '',
          usedInPvc: article.usedInPvc,
          usedInAlu: article.usedInAlu,
          orderClass: article.orderClass,
          sizeClass: article.sizeClass,
          orderUnit: article.orderUnit,
          supplierCode: article.supplierCode,
          leadTimeDays: article.leadTimeDays,
          safetyDays: article.safetyDays,
          packagingSizes: article.packagingSizes,
          preferredSize: article.preferredSize,
        });
      } else {
        setFormData({
          articleId: '',
          name: '',
          description: '',
          usedInPvc: true,
          usedInAlu: false,
          orderClass: 'typical',
          sizeClass: 'standard',
          orderUnit: 'piece',
          leadTimeDays: 14,
          safetyDays: 7,
        });
      }
      setErrors({});
    }
  }, [open, article]);

  // Walidacja
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isEditing && !formData.articleId?.trim()) {
      newErrors.articleId = 'Numer artykułu jest wymagany';
    }

    if (!formData.name?.trim()) {
      newErrors.name = 'Nazwa artykułu jest wymagana';
    }

    if (!formData.usedInPvc && !formData.usedInAlu) {
      newErrors.usage = 'Artykuł musi być używany w PVC lub ALU (lub obu)';
    }

    if (!formData.leadTimeDays || formData.leadTimeDays < 0) {
      newErrors.leadTimeDays = 'Czas realizacji musi być większy lub równy 0';
    }

    if (!formData.safetyDays || formData.safetyDays < 0) {
      newErrors.safetyDays = 'Dni bezpieczeństwa muszą być większe lub równe 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = () => {
    if (!validate()) return;

    if (isEditing) {
      // Dla edycji nie wysyłamy articleId (nie można zmienić)
      const { articleId, ...updateData } = formData;
      onSubmit(updateData);
    } else {
      onSubmit(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj artykuł' : 'Dodaj nowy artykuł'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Zmień dane artykułu. Numer artykułu nie może zostać zmieniony.'
              : 'Wypełnij dane nowego artykułu. Co najmniej jedno pole PVC lub ALU musi być zaznaczone.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Numer artykułu */}
          <div className="space-y-2">
            <Label htmlFor="articleId">
              Numer artykułu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="articleId"
              value={formData.articleId}
              onChange={(e) => setFormData({ ...formData, articleId: e.target.value })}
              placeholder="np. A123"
              disabled={isEditing || isPending}
            />
            {errors.articleId && (
              <p className="text-sm text-destructive">{errors.articleId}</p>
            )}
          </div>

          {/* Nazwa */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nazwa artykułu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nazwa artykułu"
              disabled={isPending}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Opis */}
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Opcjonalny opis artykułu"
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Użycie w PVC/ALU */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label>
              Użycie <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="usedInPvc"
                  checked={formData.usedInPvc}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, usedInPvc: checked === true })
                  }
                  disabled={isPending}
                />
                <label
                  htmlFor="usedInPvc"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  PVC
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="usedInAlu"
                  checked={formData.usedInAlu}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, usedInAlu: checked === true })
                  }
                  disabled={isPending}
                />
                <label
                  htmlFor="usedInAlu"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  ALU
                </label>
              </div>
            </div>
            {errors.usage && <p className="text-sm text-destructive">{errors.usage}</p>}
          </div>

          {/* Klasyfikacja */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderClass">Klasa zamówienia</Label>
              <Select
                value={formData.orderClass}
                onValueChange={(value) =>
                  setFormData({ ...formData, orderClass: value as 'typical' | 'atypical' })
                }
                disabled={isPending}
              >
                <SelectTrigger id="orderClass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typical">Typowy</SelectItem>
                  <SelectItem value="atypical">Atypowy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sizeClass">Klasa wielkości</Label>
              <Select
                value={formData.sizeClass}
                onValueChange={(value) =>
                  setFormData({ ...formData, sizeClass: value as 'standard' | 'gabarat' })
                }
                disabled={isPending}
              >
                <SelectTrigger id="sizeClass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="gabarat">Gabarat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Jednostka zamówienia */}
          <div className="space-y-2">
            <Label htmlFor="orderUnit">Jednostka zamówienia</Label>
            <Select
              value={formData.orderUnit}
              onValueChange={(value) =>
                setFormData({ ...formData, orderUnit: value as 'piece' | 'pack' })
              }
              disabled={isPending}
            >
              <SelectTrigger id="orderUnit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="piece">Sztuka</SelectItem>
                <SelectItem value="pack">Paczka</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kod dostawcy */}
          <div className="space-y-2">
            <Label htmlFor="supplierCode">Kod u dostawcy</Label>
            <Input
              id="supplierCode"
              value={formData.supplierCode || ''}
              onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
              placeholder="Kod artykułu u dostawcy"
              disabled={isPending}
            />
          </div>

          {/* Czasy realizacji */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Czas realizacji (dni)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="0"
                value={formData.leadTimeDays}
                onChange={(e) =>
                  setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })
                }
                disabled={isPending}
              />
              {errors.leadTimeDays && (
                <p className="text-sm text-destructive">{errors.leadTimeDays}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="safetyDays">Dni bezpieczeństwa</Label>
              <Input
                id="safetyDays"
                type="number"
                min="0"
                value={formData.safetyDays}
                onChange={(e) =>
                  setFormData({ ...formData, safetyDays: parseInt(e.target.value) || 0 })
                }
                disabled={isPending}
              />
              {errors.safetyDays && (
                <p className="text-sm text-destructive">{errors.safetyDays}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj artykuł'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

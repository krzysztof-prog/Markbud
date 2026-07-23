#!/usr/bin/env node

/**
 * regen-schema-reference.js - Auto-generowanie SCHEMA_REFERENCE.md z Prisma schema
 *
 * Parsuje apps/api/prisma/schema.prisma i generuje kompaktowy
 * dokument referencyjny z modelami, polami, relacjami i indeksami.
 *
 * Uzycie:
 *   node scripts/regen-schema-reference.js
 *   pnpm regen:schema
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'apps', 'api', 'prisma', 'schema.prisma');
const OUTPUT_FILE = path.join(ROOT, 'SCHEMA_REFERENCE.md');
const SCHEMA_REL_PATH = 'apps/api/prisma/schema.prisma';

// ---------------------------------------------------------------------------
// PARSER
// ---------------------------------------------------------------------------

/**
 * Parse the Prisma schema file and extract all models with their fields,
 * relations, indexes, and metadata.
 */
function parseSchema(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const models = [];
  let currentModel = null;
  let pendingComments = []; // Comments above a field or model

  // Collect all model names first (for relation detection)
  const modelNames = new Set();
  for (const line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      modelNames.add(modelMatch[1]);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Collect comments
    if (trimmed.startsWith('//') && currentModel === null) {
      pendingComments.push(trimmed.replace(/^\/\/\s?/, ''));
      continue;
    }

    // Model start
    const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentModel = {
        name: modelMatch[1],
        comments: [...pendingComments],
        fields: [],
        relations: [],
        indexes: [],
        uniques: [],
        mapName: null,
        hasSoftDelete: false,
      };
      pendingComments = [];
      continue;
    }

    // Model end
    if (trimmed === '}' && currentModel) {
      models.push(currentModel);
      currentModel = null;
      pendingComments = [];
      continue;
    }

    // Inside a model
    if (currentModel) {
      // Collect inline comments above fields
      if (trimmed.startsWith('//')) {
        pendingComments.push(trimmed.replace(/^\/\/\s?/, ''));
        continue;
      }

      // Empty line - reset pending comments
      if (trimmed === '') {
        pendingComments = [];
        continue;
      }

      // @@map
      const mapMatch = trimmed.match(/@@map\("([^"]+)"\)/);
      if (mapMatch) {
        currentModel.mapName = mapMatch[1];
        continue;
      }

      // @@index
      const indexMatch = trimmed.match(/@@index\(\[([^\]]+)\]\)/);
      if (indexMatch) {
        currentModel.indexes.push({
          type: 'index',
          fields: indexMatch[1].split(',').map(f => f.trim()),
        });
        continue;
      }

      // @@unique
      const uniqueMatch = trimmed.match(/@@unique\(\[([^\]]+)\]\)/);
      if (uniqueMatch) {
        currentModel.uniques.push({
          type: 'unique',
          fields: uniqueMatch[1].split(',').map(f => f.trim()),
        });
        continue;
      }

      // Parse field line
      const fieldInfo = parseFieldLine(trimmed, modelNames, pendingComments);
      if (fieldInfo) {
        if (fieldInfo.isRelation) {
          currentModel.relations.push(fieldInfo);
        } else {
          currentModel.fields.push(fieldInfo);
          // Detect soft delete
          if (fieldInfo.name === 'deletedAt' && fieldInfo.type.includes('DateTime')) {
            currentModel.hasSoftDelete = true;
          }
        }
      }

      pendingComments = [];
    } else {
      // Outside model, reset pending comments for non-comment lines
      if (!trimmed.startsWith('//')) {
        pendingComments = [];
      }
    }
  }

  return models;
}

/**
 * Parse a single field line from a Prisma model.
 */
function parseFieldLine(line, modelNames, comments) {
  // Skip @@-level attributes (already handled)
  if (line.startsWith('@@')) return null;

  // Match field: name Type? @attributes
  // The field name is the first word, type is the second
  const fieldMatch = line.match(/^(\w+)\s+(\S+)/);
  if (!fieldMatch) return null;

  const name = fieldMatch[1];
  let rawType = fieldMatch[2];

  // Skip if type looks like a keyword that's not a type
  if (['model', 'enum', 'generator', 'datasource'].includes(name)) return null;

  const isOptional = rawType.endsWith('?');
  const isList = rawType.endsWith('[]');
  const baseType = rawType.replace(/[?\[\]]/g, '');

  // Extract inline comment
  let inlineComment = '';
  const commentMatch = line.match(/\/\/\s*(.*)/);
  if (commentMatch) {
    inlineComment = commentMatch[1].trim();
  }

  // Combine comments from above and inline
  const allComments = [...comments];
  if (inlineComment) allComments.push(inlineComment);
  const commentText = allComments.join(' ').replace(/\|/g, '/');

  // Extract attributes from the line
  const attributes = [];
  const defaultValue = extractDefault(line);
  const isId = line.includes('@id');
  const isUnique = line.includes('@unique');
  const mapValue = extractFieldMap(line);
  const hasRelation = line.includes('@relation');

  if (isId) attributes.push('@id');
  if (isUnique) attributes.push('@unique');
  if (mapValue) attributes.push(`@map("${mapValue}")`);
  if (line.includes('@updatedAt')) attributes.push('@updatedAt');

  // Detect relation fields (type matches a model name)
  const isRelation = modelNames.has(baseType);

  if (isRelation) {
    // Determine relation type
    let relationType;
    if (isList) {
      relationType = 'one-to-many';
    } else if (isOptional) {
      relationType = 'many-to-one'; // nullable FK = optional relation
    } else {
      relationType = 'many-to-one'; // required FK
    }

    return {
      isRelation: true,
      name,
      relatedModel: baseType,
      isList,
      isOptional,
      relationType,
      comment: commentText,
    };
  }

  return {
    isRelation: false,
    name,
    type: rawType,
    baseType,
    isOptional,
    isList,
    defaultValue,
    isId,
    isUnique,
    mapValue,
    attributes,
    comment: commentText,
  };
}

/**
 * Extract @default(...) value from a field line.
 * Handles nested parens like @default(autoincrement()) and @default(now()).
 */
function extractDefault(line) {
  const idx = line.indexOf('@default(');
  if (idx === -1) return null;

  // Find matching closing paren (handle nested)
  let depth = 0;
  let start = idx + '@default('.length;
  let end = start;
  for (let i = start; i < line.length; i++) {
    if (line[i] === '(') depth++;
    if (line[i] === ')') {
      if (depth === 0) { end = i; break; }
      depth--;
    }
  }

  let val = line.slice(start, end);
  // Clean up: remove quotes for simple string values
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  return val;
}

/**
 * Extract @map("...") value from a field line.
 */
function extractFieldMap(line) {
  // Match @map but NOT @@map
  const match = line.match(/(?<![@@])@map\("([^"]+)"\)/);
  if (!match) return null;
  return match[1];
}

// ---------------------------------------------------------------------------
// MARKDOWN GENERATOR
// ---------------------------------------------------------------------------

/**
 * Determine key fields for the quick lookup table.
 * Key fields = non-id, non-timestamp fields that are unique or semantically important.
 */
function getKeyFields(model) {
  const skip = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt']);
  const keyFields = [];

  for (const f of model.fields) {
    if (skip.has(f.name)) continue;
    if (f.isId || f.isUnique) {
      keyFields.push(f.name);
      continue;
    }
    // Include status-like fields and value fields
    if (f.name === 'status' || f.name.endsWith('Status')) {
      keyFields.push(f.name);
      continue;
    }
    // Include value/amount fields
    if (f.name.includes('value') || f.name.includes('Value') ||
        f.name.includes('amount') || f.name.includes('Amount') ||
        f.name.includes('total') || f.name.includes('Total')) {
      keyFields.push(f.name);
      continue;
    }
  }

  // Limit to 5 key fields
  return keyFields.slice(0, 5);
}

/**
 * Get relation summary for quick lookup.
 */
function getRelationSummary(model) {
  return model.relations.map(r => {
    return r.isList ? `${r.name}[]` : r.name;
  });
}

/**
 * Format the default value for display.
 */
function formatDefault(field) {
  if (field.defaultValue === null || field.defaultValue === undefined) return '-';
  return field.defaultValue;
}

/**
 * Build notes/comments for a field.
 */
function buildFieldNotes(field) {
  const parts = [];

  if (field.isId) parts.push('@id');
  if (field.isUnique) parts.push('@unique');
  if (field.attributes.includes('@updatedAt')) parts.push('@updatedAt');

  // Add FK info from comment if it contains FK reference
  if (field.name.endsWith('Id') && !field.isId) {
    // Guess the related model from field name
    const relName = field.name.replace(/Id$/, '');
    parts.push(`FK`);
  }

  if (field.comment) {
    parts.push(field.comment);
  }

  return parts.join(', ') || '-';
}

/**
 * Generate the full SCHEMA_REFERENCE.md content.
 */
function generateMarkdown(models) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const lines = [];

  // Header
  lines.push(`# Schema Reference - AKROBUD`);
  lines.push(`> Auto-generated: ${dateStr}`);
  lines.push(`> Modeli: ${models.length} | Zrodlo: ${SCHEMA_REL_PATH}`);
  lines.push(``);

  // Quick Lookup Table
  lines.push(`## Quick Lookup`);
  lines.push(`| Model | Tabela | Pola kluczowe | Relacje | Soft Delete |`);
  lines.push(`|-------|--------|---------------|---------|-------------|`);

  for (const model of models) {
    const table = model.mapName || '-';
    const keyFields = getKeyFields(model).join(', ') || '-';
    // Limit relations in quick lookup to keep it readable (max 6)
    const allRelations = getRelationSummary(model);
    const relStr = allRelations.length > 6
      ? allRelations.slice(0, 6).join(', ') + `, ...(+${allRelations.length - 6})`
      : (allRelations.join(', ') || '-');
    const softDelete = model.hasSoftDelete ? 'tak' : '-';
    lines.push(`| ${model.name} | ${table} | ${keyFields} | ${relStr} | ${softDelete} |`);
  }

  lines.push(``);

  // Detailed models
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Szczegoly modeli`);
  lines.push(``);

  for (const model of models) {
    lines.push(`### ${model.name}`);

    // Model-level info
    const infoParts = [];
    if (model.mapName) infoParts.push(`**Tabela:** \`${model.mapName}\``);
    if (model.hasSoftDelete) infoParts.push(`**Soft Delete:** tak (deletedAt)`);
    if (infoParts.length > 0) {
      lines.push(infoParts.join(' | '));
    }

    // Model comments
    if (model.comments.length > 0) {
      lines.push(`> ${model.comments.join(' ')}`);
    }

    // Fields table
    if (model.fields.length > 0) {
      lines.push(``);
      lines.push(`**Pola:**`);
      lines.push(`| Pole | Typ | Wymagane | Default | Uwagi |`);
      lines.push(`|------|-----|----------|---------|-------|`);

      for (const field of model.fields) {
        const required = field.isOptional ? '-' : 'tak';
        const def = formatDefault(field);
        const notes = buildFieldNotes(field);
        lines.push(`| ${field.name} | ${field.baseType} | ${required} | ${def} | ${notes} |`);
      }
    }

    // Relations
    if (model.relations.length > 0) {
      lines.push(``);
      lines.push(`**Relacje:**`);
      for (const rel of model.relations) {
        const typeStr = rel.isList ? `${rel.relatedModel}[]` : rel.relatedModel;
        const relTypeLabel = rel.relationType;
        lines.push(`- \`${rel.name}\` -> ${typeStr} (${relTypeLabel})`);
      }
    }

    // Indexes and uniques
    const allIndexes = [
      ...model.uniques.map(u => `@@unique([${u.fields.join(', ')}])`),
      ...model.indexes.map(idx => `@@index([${idx.fields.join(', ')}])`),
    ];

    if (allIndexes.length > 0) {
      lines.push(``);
      lines.push(`**Indeksy:**`);
      for (const idx of allIndexes) {
        lines.push(`- \`${idx}\``);
      }
    }

    lines.push(``);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
  const startTime = Date.now();

  console.log('Parsing Prisma schema...');

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const models = parseSchema(SCHEMA_PATH);
  console.log(`  Found ${models.length} models`);

  console.log('Generating SCHEMA_REFERENCE.md...');
  const markdown = generateMarkdown(models);

  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');

  const elapsed = Date.now() - startTime;
  const lineCount = markdown.split('\n').length;
  console.log(`\nSCHEMA_REFERENCE.md generated successfully!`);
  console.log(`  ${lineCount} lines written`);
  console.log(`  ${models.length} models documented`);
  console.log(`  Time: ${elapsed}ms`);
}

main();

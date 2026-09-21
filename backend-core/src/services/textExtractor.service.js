const pdfParse = require('pdf-parse');
const AdmZip = require('adm-zip');

class TextExtractorService {
  /**
   * Extract plain text from uploaded file buffer or base64 data.
   * Supports: PDF, DOCX, PPTX, TXT, MD
   * 
   * STRICT GUARANTEE: Throws descriptive error if extracted text is empty or missing.
   * Never claims analysis succeeded on empty or blank text.
   */
  static async extractText({ buffer, base64, fileName, fileType, rawContent }) {
    // 1. If explicit raw text is provided
    if (rawContent && typeof rawContent === 'string' && rawContent.trim().length > 0) {
      const clean = rawContent.trim();
      if (clean.length < 10) {
        const err = new Error('Provided text content is too short for meaningful curriculum analysis (minimum 10 characters required).');
        err.statusCode = 400;
        err.code = 'EMPTY_TEXT_ERROR';
        throw err;
      }
      return {
        text: clean,
        extracted_character_count: clean.length,
        extracted_word_count: clean.split(/\s+/).length,
        source_type: 'raw_text',
      };
    }

    // 2. Resolve buffer from base64 if needed
    let fileBuffer = buffer;
    if (!fileBuffer && base64) {
      const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
      fileBuffer = Buffer.from(cleanBase64, 'base64');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      const err = new Error('No file buffer, document upload, or text content received for extraction.');
      err.statusCode = 400;
      err.code = 'NO_CONTENT_ERROR';
      throw err;
    }

    // Determine extension
    const ext = (fileType || (fileName ? fileName.split('.').pop() : 'txt')).toLowerCase().trim();
    let extractedText = '';

    try {
      if (ext === 'pdf') {
        extractedText = await this._extractPdf(fileBuffer);
      } else if (ext === 'docx' || ext === 'doc') {
        extractedText = await this._extractDocx(fileBuffer);
      } else if (ext === 'pptx' || ext === 'ppt') {
        extractedText = await this._extractPptx(fileBuffer);
      } else if (ext === 'txt' || ext === 'md' || ext === 'markdown' || ext === 'json' || ext === 'csv') {
        extractedText = fileBuffer.toString('utf8');
      } else {
        // Attempt utf8 text read as fallback
        extractedText = fileBuffer.toString('utf8');
      }
    } catch (parseErr) {
      const err = new Error(`Failed to extract text from ${ext.toUpperCase()} file '${fileName || 'document'}': ${parseErr.message}`);
      err.statusCode = 422;
      err.code = 'EXTRACTION_FAILED';
      err.originalError = parseErr.message;
      throw err;
    }

    // Clean and normalize whitespace
    const normalized = (extractedText || '')
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // STRICT VALIDATION: Never claim analysis succeeded on empty text
    if (!normalized || normalized.length < 15) {
      const err = new Error(
        `Text extraction resulted in empty or unreadable content for '${fileName || 'document'}'. The file might be password protected, scanned image without OCR, or empty.`
      );
      err.statusCode = 422;
      err.code = 'EMPTY_TEXT_ERROR';
      throw err;
    }

    return {
      text: normalized,
      extracted_character_count: normalized.length,
      extracted_word_count: normalized.split(/\s+/).length,
      source_type: ext,
      file_name: fileName,
    };
  }

  /**
   * PDF Extraction via pdf-parse
   */
  static async _extractPdf(buffer) {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  /**
   * DOCX Extraction via adm-zip and XML stripping
   */
  static async _extractDocx(buffer) {
    const zip = new AdmZip(buffer);
    const documentXmlEntry = zip.getEntry('word/document.xml');
    if (!documentXmlEntry) {
      throw new Error('Invalid DOCX format: word/document.xml not found');
    }

    const xmlContent = documentXmlEntry.getData().toString('utf8');
    // Extract text from <w:t> tags and separate paragraphs <w:p>
    const textWithBreaks = xmlContent
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<[^>]+>/g, '');

    return textWithBreaks;
  }

  /**
   * PPTX Extraction via adm-zip from ppt/slides/slide*.xml
   */
  static async _extractPptx(buffer) {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const slideTexts = [];

    // Find and sort all slide xml entries
    const slideEntries = zipEntries
      .filter((entry) => entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml'))
      .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true, sensitivity: 'base' }));

    if (slideEntries.length === 0) {
      throw new Error('Invalid PPTX format: no slides found in ppt/slides/');
    }

    for (const slide of slideEntries) {
      const xmlContent = slide.getData().toString('utf8');
      const text = xmlContent
        .replace(/<\/a:p>/g, '\n')
        .replace(/<[^>]+>/g, '');
      if (text.trim()) {
        slideTexts.push(text.trim());
      }
    }

    return slideTexts.join('\n\n--- Slide ---\n\n');
  }
}

module.exports = TextExtractorService;

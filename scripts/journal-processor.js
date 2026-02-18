/**
 * Utility to process Foundry Journal content into AI-friendly Markdown.
 */
export class JournalProcessor {
    /**
     * Converts enriched HTML to clean Markdown, preserving tables and headers.
     * @param {string} html - The enriched HTML string.
     * @returns {string} - The Markdown string.
     */
    static convertHtmlToMarkdown(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return this._processNode(doc.body).trim();
    }

    /**
     * Pre-processes raw journal text before enrichment.
     * Converts [[formula]] to formula so it doesn't get rolled into a result.
     * @param {string} text 
     */
    static preProcess(text) {
        if (!text) return "";
        // Regex: Matches [[...]] but NOT [[/r ...]] or [[/roll ...]]
        // This targets immediate rolls while leaving command-based rolls for enrichment.
        return text.replace(/\[\[(?!\/(?:r|roll|br|lookup))([^\]]+)\]\]/g, '$1');
    }

    static _processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.replace(/\s+/g, ' ');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        let content = "";
        for (const child of node.childNodes) {
            content += this._processNode(child);
        }

        switch (node.tagName.toLowerCase()) {
            case 'h1': return `\n# ${content}\n`;
            case 'h2': return `\n## ${content}\n`;
            case 'h3': return `\n### ${content}\n`;
            case 'strong':
            case 'b': return ` **${content.trim()}** `;
            case 'em':
            case 'i': return ` *${content.trim()}* `;
            case 'br': return `\n`;
            case 'hr': return `\n---\n`;
            case 'ul':
            case 'ol': return `\n${content}\n`;
            case 'li': return `\n- ${content.trim()}`;
            case 'a': return ` ${content.trim()} `; 
            case 'table': return this._processTable(node);
            case 'p': return `\n\n${content.trim()}\n\n`;
            case 'blockquote': return `\n> ${content.trim()}\n`;
            case 'img': 
            case 'video': return ""; 
            default: return content;
        }
    }

    static _processTable(tableNode) {
        let markdown = "\n\n";
        const rows = Array.from(tableNode.querySelectorAll('tr'));
        if (rows.length === 0) return "";
        const headers = Array.from(rows[0].querySelectorAll('th, td'));
        markdown += "| " + headers.map(h => h.textContent.trim()).join(" | ") + " |\n";
        markdown += "| " + headers.map(() => "---").join(" | ") + " |\n";
        for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td, th'));
            markdown += "| " + cells.map(c => c.textContent.trim()).join(" | ") + " |\n";
        }
        return markdown + "\n";
    }
}

class JournalProcessor {
    /**
     * Converts enriched HTML to clean Markdown, preserving tables and headers.
     * @param {string} html - The enriched HTML string.
     * @returns {string} - The Markdown string.
     */
    static convertHtmlToMarkdown(html) {
        // Create a temporary DOM parser to walk the tree
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return this._processNode(doc.body).trim();
    }

    static _processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Return text, collapsing excessive whitespace
            return node.textContent.replace(/\s+/g, ' ');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        let content = "";
        // Process child nodes recursively
        for (const child of node.childNodes) {
            content += this._processNode(child);
        }

        switch (node.tagName.toLowerCase()) {
            // --- Headings ---
            case 'h1': return `\n# ${content}\n`;
            case 'h2': return `\n## ${content}\n`;
            case 'h3': return `\n### ${content}\n`;
            case 'h4': return `\n#### ${content}\n`;
            
            // --- Formatting ---
            case 'strong':
            case 'b': return ` **${content.trim()}** `;
            case 'em':
            case 'i': return ` *${content.trim()}* `;
            case 'br': return `\n`;
            case 'hr': return `\n---\n`;
            
            // --- Lists ---
            case 'ul': return `\n${content}\n`;
            case 'ol': return `\n${content}\n`;
            case 'li': return `\n- ${content.trim()}`;
            
            // --- Links & Enrichers ---
            // Important: We strip the <a> tag but KEEP the content (the resolved name)
            case 'a': return ` ${content.trim()} `; 

            // --- Tables (The Complex Part) ---
            case 'table': return this._processTable(node);
            case 'tr': return ""; // Handled in _processTable
            case 'td': return ""; // Handled in _processTable
            case 'th': return ""; // Handled in _processTable
            case 'tbody': return content;
            case 'thead': return content;

            // --- Containers ---
            case 'p': return `\n\n${content.trim()}\n\n`;
            case 'div': 
            case 'section': return `\n${content}\n`;
            case 'blockquote': return `\n> ${content.trim()}\n`;

            // --- Media (Strip these) ---
            case 'img': 
            case 'video':
            case 'audio': return ""; // Ignore media

            default: return content;
        }
    }

    static _processTable(tableNode) {
        let markdown = "\n\n";
        const rows = Array.from(tableNode.querySelectorAll('tr'));
        
        if (rows.length === 0) return "";

        // Process Header
        const headers = Array.from(rows[0].querySelectorAll('th, td'));
        markdown += "| " + headers.map(h => h.textContent.trim()).join(" | ") + " |\n";
        markdown += "| " + headers.map(() => "---").join(" | ") + " |\n";

        // Process Body (skip first row if it was used as header)
        for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td, th'));
            markdown += "| " + cells.map(c => c.textContent.trim()).join(" | ") + " |\n";
        }
        
        return markdown + "\n";
    }
}

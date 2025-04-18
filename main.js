// --- Translations ---
        const translations = {
            en: {
                pageTitle: "NameCraft.js - Variable Name Generator",
                title: "NameCraft.js",
                subtitle: "Enter a phrase (accents/special chars like 'ł' will be simplified) or edit a generated name below.",
                inputPlaceholderLoading: "Loading random words...",
                inputPlaceholderDefault: "Enter phrase...",
                editInputButtonLabel: "Edit input phrase",
                formatLabel: "Format:",
                formatNone: "None",
                formatPrefixDollar: "Prefix $",
                formatSingleQuotes: "Enclose ' '",
                formatDoubleQuotes: "Enclose \" \"",
                generatedNamesLabel: "Generated Names:",
                editOutputButtonLabel: "Edit {convention} name", // Placeholder for convention
                copyOutputButtonLabel: "Copy {convention} name", // Placeholder for convention
                copiedFeedback: "Copied!",
                errorFeedback: "Error!",
                dragHandleLabel: "Drag to reorder" // Added for drag handle
            },
            pl: {
                pageTitle: "NameCraft.js - Generator Nazw Zmiennych",
                title: "NameCraft.js", // Keep title potentially
                subtitle: "Wpisz frazę (akcenty/znaki specjalne jak 'ł' zostaną uproszczone) lub edytuj wygenerowaną nazwę poniżej.",
                inputPlaceholderLoading: "Ładowanie losowych słów...",
                inputPlaceholderDefault: "Wpisz frazę...",
                editInputButtonLabel: "Edytuj frazę wejściową",
                formatLabel: "Format:",
                formatNone: "Brak",
                formatPrefixDollar: "Prefiks $",
                formatSingleQuotes: "Otocz ' '",
                formatDoubleQuotes: "Otocz \" \"",
                generatedNamesLabel: "Wygenerowane Nazwy:",
                editOutputButtonLabel: "Edytuj nazwę {convention}",
                copyOutputButtonLabel: "Kopiuj nazwę {convention}",
                copiedFeedback: "Skopiowano!",
                errorFeedback: "Błąd!",
                dragHandleLabel: "Przeciągnij, aby zmienić kolejność" // Added for drag handle
            }
        };

        let currentLanguage = 'en'; // Default language

        // --- LocalStorage Keys ---
        const LS_LANG_KEY = 'nameCraftLang';
        const LS_FORMAT_KEY = 'nameCraftFormat';
        const LS_ORDER_KEY = 'nameCraftOrder';


        /**
         * Updates the UI text elements based on the selected language.
         * @param {string} lang - The language code ('en' or 'pl').
         */
        function updateUI(lang) {
            currentLanguage = lang; // Store current language
            document.documentElement.lang = lang; // Update html lang attribute

            document.querySelectorAll('[data-translate-key]').forEach(element => {
                const key = element.getAttribute('data-translate-key');
                const translation = translations[lang]?.[key];

                if (translation !== undefined) {
                    if (element.hasAttribute('placeholder')) {
                        // Avoid overwriting placeholder if input has value or is loading
                        if (!element.value.trim() || element.placeholder === translations.en.inputPlaceholderLoading || element.placeholder === translations.pl.inputPlaceholderLoading) {
                             element.setAttribute('placeholder', translation);
                        }
                    } else if (element.hasAttribute('aria-label')) {
                        // Handle dynamic aria-labels for output buttons
                        if (key === 'editOutputButtonLabel' || key === 'copyOutputButtonLabel' || key === 'dragHandleLabel') {
                            // Use data-convention attribute stored on the button itself or find it
                             const convention = element.dataset.convention || element.closest('.draggable-row')?.querySelector('[data-convention]')?.dataset.convention || 'item';
                            element.setAttribute('aria-label', translation.replace('{convention}', convention));
                        } else {
                             element.setAttribute('aria-label', translation);
                        }
                    } else if (element.tagName === 'TITLE') {
                         document.title = translation; // Set page title
                    }
                    else {
                        // Avoid translating the convention label itself if it has the key
                        if(!element.classList.contains('convention-label')) {
                             element.textContent = translation;
                        }
                    }
                } else {
                     // Only warn if the key exists in the default language (English)
                    if (translations.en[key]) {
                        console.warn(`Translation key "${key}" not found for language "${lang}"`);
                    }
                }
            });

             // Update dynamic placeholder for input text if needed (redundant with check above, but safe)
            const inputTextElement = document.getElementById('inputText');
            if (inputTextElement && !inputTextElement.value.trim() && inputTextElement.placeholder !== translations[lang].inputPlaceholderLoading) {
                inputTextElement.placeholder = translations[lang].inputPlaceholderDefault;
            }
        }


        /**
         * Cleans the input string for initial generation.
         */
        function cleanStringForGeneration(str) {
            if (typeof str !== 'string') return '';
            let processed = str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
            processed = processed.replace(/ł/g, 'l').replace(/Ł/g, 'L');
            return processed
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .toLowerCase()
                .trim();
        }

        /**
         * Parses a formatted name back into a space-separated phrase.
         * Attempts to remove formatting before parsing.
         */
        function parseNameToPhrase(name, convention) {
            let baseName = name.trim();
            // Attempt to remove potential formatting ($ or quotes)
            if (baseName.startsWith('$')) {
                baseName = baseName.substring(1);
            }
            if ((baseName.startsWith("'") && baseName.endsWith("'")) || (baseName.startsWith('"') && baseName.endsWith('"'))) {
                baseName = baseName.substring(1, baseName.length - 1);
            }

            if (!baseName || typeof baseName !== 'string') return '';
            try {
                let cleanedName = baseName.normalize('NFD').replace(/\p{Diacritic}/gu, '');
                cleanedName = cleanedName.replace(/ł/g, 'l').replace(/Ł/g, 'L');

                let phrase = cleanedName;
                switch (convention.toLowerCase()) {
                    case 'camelcase':
                    case 'pascalcase':
                        phrase = cleanedName.replace(/([A-Z]+(?=[A-Z][a-z]))|([a-z\d])(?=[A-Z])/g, '$& ');
                        break;
                    case 'snake_case':
                    case 'constant':
                        phrase = cleanedName.replace(/_/g, ' ');
                        break;
                    case 'kebab-case':
                        phrase = cleanedName.replace(/-/g, ' ');
                        break;
                }
                return phrase.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            } catch (error) {
                console.error("Error parsing name:", error);
                return baseName.toLowerCase().replace(/[^a-zA-Z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
            }
        }

        /**
         * Applies selected formatting (prefix, quotes) based on radio button value.
         * @param {string} baseName - The unformatted variable name.
         * @param {string} selectedFormatValue - The value of the checked radio button ('none', 'dollar', 'single', 'double').
         * @returns {string} The formatted name.
         */
        function applyFormatting(baseName, selectedFormatValue) {
            if (!baseName || baseName === '...') return baseName; // Don't format placeholder

            switch (selectedFormatValue) {
                case 'dollar':
                    return '$' + baseName;
                case 'single':
                    return "'" + baseName + "'";
                case 'double':
                    return '"' + baseName + '"';
                case 'none':
                default:
                    return baseName; // No formatting
            }
        }


        /**
         * Base class for name generators
         */
        class NameGenerator {
            constructor(id, label) {
                if (this.constructor === NameGenerator) {
                    throw new Error("Abstract class 'NameGenerator' cannot be instantiated directly.");
                }
                this.id = id; // e.g., outputCamelCase
                this.label = label; // e.g., camelCase (kept untranslated)
            }

            generate(inputText) {
                throw new Error("Method 'generate()' must be implemented.");
            }

            // Updated createHtml to include draggable attribute and drag handle
            createHtml() {
                 // Note: Added draggable="true", class="draggable-row", and the drag-handle span
                 // Added unique ID to the row itself: id="row-${this.id}"
                 return `
                    <div id="row-${this.id}" class="draggable-row flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200 shadow-sm" draggable="true">
                        <div class="flex items-center flex-grow min-w-0 mr-2">
                            <span class="drag-handle cursor-move text-gray-400 mr-2 hover:text-gray-600"
                                  data-translate-key="dragHandleLabel"
                                  aria-label="Drag to reorder">⠿</span>
                            <span class="font-medium text-gray-700 w-28 flex-shrink-0 convention-label">${this.label}:</span>
                            <code id="${this.id}" class="text-gray-800 bg-gray-200 px-2 py-1 rounded text-sm break-all ml-2 flex-grow" spellcheck="false">...</code>
                        </div>
                        <div class="button-container flex-shrink-0 ml-2">
                            <button class="editButton p-1 text-gray-500 hover:text-blue-600 transition duration-150 mr-1"
                                    data-target="${this.id}"
                                    data-convention="${this.label}"
                                    data-translate-key="editOutputButtonLabel"
                                    aria-label="Edit ${this.label} name">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                            <div class="copy-button-container" data-feedback-key="copiedFeedback" data-error-key="errorFeedback">
                                <button class="copyButton p-1 text-gray-500 hover:text-green-600 transition duration-150"
                                        data-target="${this.id}"
                                        data-convention="${this.label}" /* Added data-convention here too */
                                        data-translate-key="copyOutputButtonLabel"
                                        aria-label="Copy ${this.label} name">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <span class="copied-feedback">Copied!</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // --- Specific Generator Classes (No changes needed) ---
        class CamelCaseGenerator extends NameGenerator {
            generate(inputText) {
                const cleaned = cleanStringForGeneration(inputText);
                if (!cleaned) return '';
                const parts = cleaned.split(/\s+/);
                return parts[0].toLowerCase() + parts.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
            }
        }
        class PascalCaseGenerator extends NameGenerator {
            generate(inputText) {
                const cleaned = cleanStringForGeneration(inputText);
                 if (!cleaned) return '';
                return cleaned.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
            }
        }
        class SnakeCaseGenerator extends NameGenerator {
            generate(inputText) {
                const cleaned = cleanStringForGeneration(inputText);
                if (!cleaned) return '';
                return cleaned.replace(/\s+/g, '_');
            }
        }
        class KebabCaseGenerator extends NameGenerator {
            generate(inputText) {
                const cleaned = cleanStringForGeneration(inputText);
                 if (!cleaned) return '';
                return cleaned.replace(/\s+/g, '-');
            }
        }
        class ConstantCaseGenerator extends NameGenerator {
            generate(inputText) {
                const cleaned = cleanStringForGeneration(inputText);
                 if (!cleaned) return '';
                return cleaned.replace(/\s+/g, '_').toUpperCase();
            }
        }

        // --- Main Application Logic ---
        document.addEventListener('DOMContentLoaded', () => {
            // --- DOM Elements ---
            const inputTextElement = document.getElementById('inputText');
            const editInputButton = document.getElementById('editInputButton');
            const outputContainer = document.getElementById('outputContainer');
            const formattingOptionsContainer = document.getElementById('formattingOptionsContainer');
            const languageSelector = document.getElementById('languageSelector');

            // --- State ---
            let isEditing = false;
            let currentEditTarget = null;
            let draggedElement = null; // Keep track of the element being dragged
            let placeholderElement = null; // Reference to the drop placeholder

            // --- List of Generator Instances ---
            // NOTE: The order here defines the *default* order if nothing is saved
            const generators = [
                new CamelCaseGenerator('outputCamelCase', 'camelCase'),
                new PascalCaseGenerator('outputPascalCase', 'PascalCase'),
                new SnakeCaseGenerator('outputSnakeCase', 'snake_case'),
                new KebabCaseGenerator('outputKebabCase', 'kebab-case'),
                new ConstantCaseGenerator('outputConstantCase', 'CONSTANT')
            ];

            // --- Initialize UI ---
            // Create elements based on default generator order FIRST
            generators.forEach(generator => {
                outputContainer.insertAdjacentHTML('beforeend', generator.createHtml());
            });
            // Create placeholder element (but don't append yet)
            placeholderElement = document.createElement('div');
            placeholderElement.className = 'drop-placeholder';

            // --- Persistence Functions ---
            function saveLanguage(lang) {
                try {
                    localStorage.setItem(LS_LANG_KEY, lang);
                } catch (e) { console.error("LocalStorage Error:", e); }
            }
            function saveFormattingOption(formatValue) {
                 try {
                    localStorage.setItem(LS_FORMAT_KEY, formatValue);
                 } catch (e) { console.error("LocalStorage Error:", e); }
            }
            function saveRowOrder() {
                 try {
                    const rows = outputContainer.querySelectorAll('.draggable-row');
                    const currentOrder = Array.from(rows).map(row => row.id); // Store array of row IDs
                    localStorage.setItem(LS_ORDER_KEY, JSON.stringify(currentOrder));
                 } catch (e) { console.error("LocalStorage Error:", e); }
            }

            function loadSettingsAndApply() {
                let initialLang = 'en'; // Default language
                // Load Language
                try {
                    const savedLang = localStorage.getItem(LS_LANG_KEY);
                    if (savedLang && translations[savedLang]) {
                        initialLang = savedLang;
                        languageSelector.value = savedLang;
                    }
                } catch (e) { console.error("LocalStorage Error:", e); }

                // Apply loaded language to UI FIRST
                updateUI(initialLang);

                // Load Formatting Option
                 try {
                    const savedFormat = localStorage.getItem(LS_FORMAT_KEY);
                    if (savedFormat) {
                        const radioToSelect = formattingOptionsContainer.querySelector(`input[name="formatting"][value="${savedFormat}"]`);
                        if (radioToSelect) {
                            radioToSelect.checked = true;
                        }
                    }
                } catch (e) { console.error("LocalStorage Error:", e); }


                // Load and Apply Row Order
                 try {
                    const savedOrderJSON = localStorage.getItem(LS_ORDER_KEY);
                    if (savedOrderJSON) {
                        const savedOrder = JSON.parse(savedOrderJSON);
                        if (Array.isArray(savedOrder)) {
                            // Re-append elements in the saved order
                            // Ensure the heading stays first
                            const heading = outputContainer.querySelector('h2');
                            if(heading) outputContainer.appendChild(heading);

                            savedOrder.forEach(rowId => {
                                const rowElement = document.getElementById(rowId);
                                if (rowElement) {
                                    outputContainer.appendChild(rowElement); // Appending moves the element
                                } else {
                                    console.warn(`Saved row ID "${rowId}" not found in DOM.`);
                                }
                            });
                        }
                    }
                 } catch (e) {
                    console.error("Error parsing or applying saved row order:", e);
                    localStorage.removeItem(LS_ORDER_KEY); // Clear invalid data
                 }
            }

            // --- Load settings and apply them ---
            loadSettingsAndApply();


             /**
             * Gets the value of the currently selected formatting radio button.
             * @returns {string} The value ('none', 'dollar', 'single', 'double').
             */
            function getSelectedFormatValue() {
                 const checkedRadio = formattingOptionsContainer.querySelector('input[name="formatting"]:checked');
                 return checkedRadio ? checkedRadio.value : 'none'; // Default to 'none' if somehow none are checked
            }

            // --- Event Handlers ---

            /**
             * Regenerates all output fields based on the current input and selected formatting option.
             */
            function regenerateAllOutputs() {
                const input = inputTextElement.value;
                const selectedFormat = getSelectedFormatValue(); // Get current radio value

                // Update placeholder based on input content and language
                if (!input.trim() && inputTextElement.placeholder !== translations[currentLanguage].inputPlaceholderLoading) {
                     inputTextElement.placeholder = translations[currentLanguage].inputPlaceholderDefault;
                }


                generators.forEach(generator => {
                    const outputElement = document.getElementById(generator.id);
                    if (outputElement) {
                        if (outputElement !== currentEditTarget) {
                            const baseName = input.trim() ? generator.generate(input) : '...';
                            // Apply formatting based on the selected radio button
                            outputElement.textContent = applyFormatting(baseName, selectedFormat);
                        }
                    } else {
                        // Element might not exist yet if called during init, ignore error
                        // console.error(`Output element not found for ID: ${generator.id}`);
                    }
                });
                 // Ensure dynamic aria-labels are also updated after potential regeneration
                 updateUI(currentLanguage);
             }

            function handleEditFinish() {
                if (!currentEditTarget) return;

                const editedValue = currentEditTarget.textContent;
                const convention = currentEditTarget.dataset.convention ||
                                   currentEditTarget.closest('.draggable-row').querySelector('.editButton')?.dataset.convention;


                const originalInputValue = inputTextElement.value;
                const selectedFormat = getSelectedFormatValue(); // Get format *before* potential change

                // Clean up edit state
                currentEditTarget.contentEditable = 'false';
                currentEditTarget.classList.remove('editing');
                currentEditTarget.removeEventListener('blur', handleEditFinish);
                currentEditTarget.removeEventListener('keydown', handleEditKeyDown);
                const finishedEditingElement = currentEditTarget;
                isEditing = false;
                currentEditTarget = null;

                const parsedPhrase = parseNameToPhrase(editedValue, convention);

                if (parsedPhrase && parsedPhrase !== originalInputValue) {
                     inputTextElement.value = parsedPhrase;
                     regenerateAllOutputs(); // Regenerate all with new phrase and current format
                } else {
                     // Revert the edited field
                     const genInstance = generators.find(g => g.id === finishedEditingElement.id);
                     if (genInstance) {
                         const baseName = originalInputValue.trim() ? genInstance.generate(originalInputValue) : '...';
                         // Apply formatting based on current radio selection
                         finishedEditingElement.textContent = applyFormatting(baseName, selectedFormat);
                     }
                     inputTextElement.value = originalInputValue;
                     // Regenerate others to ensure consistency if only edited field reverted
                     regenerateAllOutputs();
                }
            }

            function handleEditKeyDown(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleEditFinish();
                } else if (event.key === 'Escape') {
                     if (currentEditTarget) {
                        const genInstance = generators.find(g => g.id === currentEditTarget.id);
                        const baseName = inputTextElement.value.trim() ? genInstance?.generate(inputTextElement.value) : '...';
                        // Revert content with current formatting
                        currentEditTarget.textContent = applyFormatting(baseName, getSelectedFormatValue());

                        currentEditTarget.contentEditable = 'false';
                        currentEditTarget.classList.remove('editing');
                        currentEditTarget.removeEventListener('blur', handleEditFinish);
                        currentEditTarget.removeEventListener('keydown', handleEditKeyDown);
                        isEditing = false;
                        currentEditTarget = null;
                     }
                }
            }

            function handleOutputContainerClick(event) {
                const copyButton = event.target.closest('.copyButton');
                const editButton = event.target.closest('.editButton');

                if (copyButton && !isEditing) { // Handle Copy Click
                    const targetId = copyButton.getAttribute('data-target');
                    const targetElement = document.getElementById(targetId);
                    // Find feedback span within the specific button's container
                    const feedbackContainer = copyButton.closest('.copy-button-container');
                    const feedbackElement = feedbackContainer.querySelector('.copied-feedback');
                    const copiedKey = feedbackContainer.dataset.feedbackKey;
                    const errorKey = feedbackContainer.dataset.errorKey;


                    if (!targetElement || !feedbackElement || !copiedKey || !errorKey) return;
                    const textToCopy = targetElement.textContent;

                    const copiedText = translations[currentLanguage][copiedKey] || "Copied!";
                    const errorText = translations[currentLanguage][errorKey] || "Error!";


                    if (textToCopy && textToCopy !== '...') {
                        navigator.clipboard.writeText(textToCopy)
                            .then(() => { /* Show feedback */
                                feedbackElement.textContent = copiedText; // Use translated text
                                feedbackElement.style.backgroundColor = '#4CAF50'; // Ensure green
                                feedbackElement.classList.add('show');
                                setTimeout(() => { feedbackElement.classList.remove('show'); }, 1500);
                            })
                            .catch(err => { /* Show error feedback */
                                console.error('Failed to copy text: ', err);
                                feedbackElement.textContent = errorText; // Use translated text
                                feedbackElement.style.backgroundColor = 'red'; // Ensure red
                                feedbackElement.classList.add('show');
                                setTimeout(() => {
                                   feedbackElement.classList.remove('show');
                                }, 1500);
                            });
                    }
                } else if (editButton && !isEditing) { // Handle Edit Click
                    isEditing = true;
                    const targetId = editButton.getAttribute('data-target');
                    currentEditTarget = document.getElementById(targetId);

                    if (currentEditTarget) {
                        currentEditTarget.dataset.convention = editButton.dataset.convention;

                        // Remove current formatting before editing
                        const selectedFormat = getSelectedFormatValue();
                        let baseValue = currentEditTarget.textContent;
                         switch (selectedFormat) {
                            case 'dollar':
                                if (baseValue.startsWith('$')) baseValue = baseValue.substring(1);
                                break;
                            case 'single':
                                if (baseValue.startsWith("'") && baseValue.endsWith("'")) baseValue = baseValue.substring(1, baseValue.length - 1);
                                break;
                            case 'double':
                                if (baseValue.startsWith('"') && baseValue.endsWith('"')) baseValue = baseValue.substring(1, baseValue.length - 1);
                                break;
                        }
                        currentEditTarget.textContent = baseValue; // Show base value

                        currentEditTarget.contentEditable = 'true';
                        currentEditTarget.classList.add('editing');
                        currentEditTarget.focus();

                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(currentEditTarget);
                        selection.removeAllRanges();
                        selection.addRange(range);

                        currentEditTarget.addEventListener('blur', handleEditFinish, { once: true });
                        currentEditTarget.addEventListener('keydown', handleEditKeyDown);
                    } else {
                        isEditing = false;
                    }
                }
            }

            // --- Fetch Initial Random Words (Using Datamuse API) ---
            const randomWordApiUrl = 'https://api.datamuse.com/words?sp=*&max=100'; // Fetch 100 common words

            fetch(randomWordApiUrl)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`HTTP error fetching random words from Datamuse! status: ${response.status}`);
                        return null; // Indicate failure
                    }
                    return response.json(); // Returns array like [{word: "the", score: ...}, ...]
                })
                .then(data => {
                    // Check if data is an array and has enough words
                    if (Array.isArray(data) && data.length >= 3) {
                        // Select 3 random words from the response
                        const words = [];
                        const availableWords = [...data]; // Clone to avoid modifying original
                        for (let i = 0; i < 3; i++) {
                            if (availableWords.length === 0) break; // Stop if we run out
                            const randomIndex = Math.floor(Math.random() * availableWords.length);
                            // Ensure the word is reasonably simple (alphabetic only)
                            const potentialWord = availableWords[randomIndex].word;
                            if (/^[a-zA-Z]+$/.test(potentialWord)) { // Check if alphabetic
                                words.push(potentialWord);
                            } else {
                                i--; // Decrement i to try again if word is not suitable
                            }
                            availableWords.splice(randomIndex, 1); // Remove selected word/object
                        }

                        if (words.length >= 1) { // Use if at least one word found
                            const initialPhrase = words.join(' ');
                            inputTextElement.value = initialPhrase;
                        } else {
                             console.error('Could not select any distinct alphabetic words from Datamuse response.');
                        }

                    } else if (data !== null) { // Check if fetch didn't already fail
                        console.error('Datamuse API did not return expected array or enough words:', data);
                    }
                    // Regenerate outputs and update UI text (including placeholder)
                    // This will now use the loaded settings (format, lang)
                    regenerateAllOutputs();
                })
                .catch(error => {
                    // Keep the improved error logging
                    console.error('Error fetching random words from Datamuse. Likely a network issue.');
                     if (error instanceof Error) {
                         console.error('Message:', error.message);
                         if (error.stack) {
                            console.error('Stack trace:', error.stack);
                         }
                    } else {
                        console.error('Full error object:', error);
                    }
                    // Regenerate to clear placeholder and apply default lang text & loaded settings
                    regenerateAllOutputs();
                });


            // --- Drag and Drop Logic ---

            /** Removes the placeholder element from the DOM */
            function removePlaceholder() {
                if (placeholderElement && placeholderElement.parentNode) {
                    placeholderElement.parentNode.removeChild(placeholderElement);
                }
            }

            /**
             * Finds the element after which the dragged element should be placed.
             * @param {HTMLElement} container - The container element.
             * @param {number} y - The vertical mouse coordinate.
             * @returns {HTMLElement|null} The element to insert before, or null to append.
             */
            function getDragAfterElement(container, y) {
                // Select only direct children rows within the container, excluding the placeholder and the element being dragged
                const draggableElements = [...container.querySelectorAll(':scope > .draggable-row:not(.dragging)')];

                return draggableElements.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;
            }

            // Add Drag and Drop event listeners using delegation on the container
            outputContainer.addEventListener('dragstart', (event) => {
                 const targetRow = event.target.closest('.draggable-row');
                 if (!targetRow) return;

                 draggedElement = targetRow;
                 setTimeout(() => {
                    if (draggedElement) draggedElement.classList.add('dragging');
                 }, 0);
                 event.dataTransfer.setData('text/plain', targetRow.id || 'dragging-element');
                 event.dataTransfer.effectAllowed = 'move';
            });

            outputContainer.addEventListener('dragend', () => {
                if (draggedElement) {
                    draggedElement.classList.remove('dragging');
                    draggedElement = null;
                }
                removePlaceholder(); // Ensure placeholder is removed on drag end/cancel
            });

            outputContainer.addEventListener('dragover', (event) => {
                 event.preventDefault();
                 event.dataTransfer.dropEffect = 'move';

                 const afterElement = getDragAfterElement(outputContainer, event.clientY);

                 if (afterElement == null) {
                     if (outputContainer.lastElementChild !== placeholderElement) {
                         outputContainer.appendChild(placeholderElement);
                     }
                 } else {
                     if (placeholderElement.nextSibling !== afterElement) {
                        outputContainer.insertBefore(placeholderElement, afterElement);
                     }
                 }
            });

             outputContainer.addEventListener('dragenter', (event) => {
                 const related = event.relatedTarget;
                 const container = event.currentTarget;
                 if (!related || !container.contains(related)) {
                    event.preventDefault();
                 }
             });

             outputContainer.addEventListener('dragleave', (event) => {
                 const related = event.relatedTarget;
                 const container = event.currentTarget;
                 if (!related || !container.contains(related)) {
                    removePlaceholder();
                 }
             });


            outputContainer.addEventListener('drop', (event) => {
                event.preventDefault();
                removePlaceholder();

                if (!draggedElement) return;

                const afterElement = getDragAfterElement(outputContainer, event.clientY);

                if (afterElement == null) {
                    outputContainer.appendChild(draggedElement);
                } else {
                    outputContainer.insertBefore(draggedElement, afterElement);
                }
                saveRowOrder(); // Save the new order after dropping
            });


            // --- Attach Other Event Listeners ---
            // Edit input button listener
            editInputButton.addEventListener('click', () => {
                inputTextElement.focus(); // Set focus first
                inputTextElement.select(); // Then select all text
            });

            // Output container listener (copy/edit) - already attached via delegation
            outputContainer.addEventListener('click', handleOutputContainerClick);

            // Formatting options listener
            formattingOptionsContainer.addEventListener('change', (event) => {
                if (event.target.type === 'radio' && event.target.name === 'formatting') {
                    const selectedFormat = event.target.value;
                    saveFormattingOption(selectedFormat); // Save new format
                    regenerateAllOutputs();
                }
            });

            // Live input listener
            inputTextElement.addEventListener('input', regenerateAllOutputs);

            // Enter key listener for main input
            inputTextElement.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (isEditing && currentEditTarget) {
                       handleEditFinish();
                    }
                }
            });

            // Language selector listener
            languageSelector.addEventListener('change', (event) => {
                const newLang = event.target.value;
                saveLanguage(newLang); // Save new language
                updateUI(newLang);
                 regenerateAllOutputs(); // Ensure placeholders/aria-labels are updated
            });

            // Note: Initial generation call is handled within the .then() or .catch() of the fetch
            // after settings have been loaded and applied by loadSettingsAndApply().

        });

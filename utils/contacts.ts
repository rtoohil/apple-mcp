import { run } from '@jxa/run';
import { createLogger } from './Logger.js';

const logger = createLogger('contacts');
import { runAppleScript } from 'run-applescript';
import { validateContactName, validatePhoneNumber, validateEmail, escapeForLogging } from './ValidationUtils';
import { getContactCache } from './ContactCache';
import type { ContactsData, ContactInfo } from './ContactCache';

// Type for search results from JXA
interface ContactSearchResult {
    name: string;
    phones: string[];
    emails: string[];
    addresses: string[];
}

// Fuzzy search scoring interface
interface FuzzySearchResult {
    contact: ContactInfo;
    score: number;
    matchType: 'name' | 'email' | 'phone';
    matchValue: string;
}

async function checkContactsAccess(): Promise<boolean> {
    try {
        logger.info('Checking Contacts access...');
        // Try to get the count of contacts as a simple test
        const result = await runAppleScript(`
tell application "Contacts"
    count every person
end tell`);
        logger.success(`Contacts access check successful. Found ${result} contacts.`);
        return true;
    } catch (error) {
        logger.error('Contacts access check failed:', { error: error });
        throw new Error("Cannot access Contacts app. Please grant access in System Preferences > Security & Privacy > Privacy > Contacts.");
    }
}

async function getAllContactsAppleScript(): Promise<ContactsData> {
    try {
        logger.info('Trying AppleScript fallback for getAllContacts...');
        const script = `
tell application "Contacts"
    set contactsList to ""
    repeat with aPerson in every person
        try
            set personName to name of aPerson
            set contactData to personName & "||"
            
            -- Get phone numbers
            set phoneList to phones of aPerson
            set phoneValues to ""
            repeat with aPhone in phoneList
                set phoneValue to value of aPhone
                set phoneValues to phoneValues & phoneValue & ","
            end repeat
            if phoneValues ends with "," then set phoneValues to text 1 thru -2 of phoneValues
            set contactData to contactData & phoneValues & "||"
            
            -- Get email addresses
            set emailList to emails of aPerson
            set emailValues to ""
            repeat with anEmail in emailList
                set emailValue to value of anEmail
                set emailValues to emailValues & emailValue & ","
            end repeat
            if emailValues ends with "," then set emailValues to text 1 thru -2 of emailValues
            set contactData to contactData & emailValues & "||"
            
            -- Get addresses
            set addressList to addresses of aPerson
            set addressValues to ""
            repeat with anAddress in addressList
                try
                    set addressValue to formatted address of anAddress
                    set addressValue to my replaceText(addressValue, "\\n", " ")
                    set addressValues to addressValues & addressValue & ","
                on error
                    -- Skip addresses that can't be formatted
                end try
            end repeat
            if addressValues ends with "," then set addressValues to text 1 thru -2 of addressValues
            set contactData to contactData & addressValues
            
            set contactsList to contactsList & contactData & "\\n"
        on error
            -- Skip contacts that can't be processed
        end try
    end repeat
    return contactsList
end tell

on replaceText(sourceText, oldText, newText)
    set AppleScript's text item delimiters to oldText
    set textItems to text items of sourceText
    set AppleScript's text item delimiters to newText
    set resultText to textItems as string
    set AppleScript's text item delimiters to ""
    return resultText
end replaceText`;

        const result = await runAppleScript(script);
        console.error("AppleScript result type:", typeof result);
        console.error("AppleScript result sample:", typeof result === 'string' ? result.substring(0, 200) + '...' : result);
        
        // Parse the AppleScript result into our expected format
        const contacts: ContactsData = {};
        
        if (typeof result === 'string' && result.trim()) {
            const lines = result.trim().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                const parts = line.split('||');
                if (parts.length >= 4) {
                    const [name, phoneStr, emailStr, addressStr] = parts;
                    if (name && name.trim()) {
                        const phones = phoneStr ? phoneStr.split(',').map(p => p.trim()).filter(p => p) : [];
                        const emails = emailStr ? emailStr.split(',').map(e => e.trim()).filter(e => e) : [];
                        const addresses = addressStr ? addressStr.split(',').map(a => a.trim()).filter(a => a) : [];
                        
                        contacts[name.trim()] = {
                            name: name.trim(),
                            phones,
                            emails,
                            addresses
                        };
                    }
                }
            }
        }
        
        logger.info(`AppleScript parsed ${Object.keys(contacts).length} contacts.`);
        return contacts;
    } catch (error) {
        logger.error('AppleScript fallback failed:', { error: error });
        throw error;
    }
}

async function getAllContacts(): Promise<ContactsData> {
    try {
        logger.info('Starting getAllContacts...');
        
        // Check cache first
        const cache = getContactCache();
        const cachedData = cache.get('allContacts');
        if (cachedData) {
            logger.info(`Cache hit! Using cached data with ${Object.keys(cachedData).length} contacts.`);
            return cachedData;
        }
        
        if (!await checkContactsAccess()) {
            return {};
        }

        // Try JXA first, fallback to AppleScript if it fails
        let contactsData: ContactsData = {};
        try {
            logger.info('Running JXA script to get all contacts...');
            const contacts: ContactsData = await run(() => {
                const Contacts = Application('Contacts');
                console.log("Contacts app accessed successfully");
                
                const people = Contacts.people();
                console.log(`Found ${people.length} people in contacts`);
                
                const contactsMap: { [key: string]: ContactInfo } = {};

                for (let i = 0; i < people.length; i++) {
                    try {
                        const person = people[i];
                        const name = person.name();
                        console.log(`Processing contact: ${name}`);
                        
                        if (!name) continue;
                        
                        // Get phone numbers
                        const phones = person.phones();
                        const phoneValues = phones.map((phone: any) => phone.value()).filter((v: string) => v);
                        
                        // Get email addresses
                        const emails = person.emails();
                        const emailValues = emails.map((email: any) => email.value()).filter((v: string) => v);
                        
                        // Get addresses
                        const addresses = person.addresses();
                        const addressValues = addresses.map((addr: any) => {
                            try {
                                const formatted = addr.formattedAddress();
                                return formatted ? formatted.replace(/\n/g, ' ').trim() : '';
                            } catch {
                                return '';
                            }
                        }).filter((v: string) => v);

                        contactsMap[name] = {
                            name,
                            phones: phoneValues,
                            emails: emailValues,
                            addresses: addressValues
                        };
                        
                        console.log(`Added contact: ${name} with ${phoneValues.length} phones, ${emailValues.length} emails, ${addressValues.length} addresses`);
                    } catch (error) {
                        console.log(`Error processing contact ${i}:`, error);
                        // Skip contacts that can't be processed
                    }
                }

                console.log(`Processed ${Object.keys(contactsMap).length} contacts`);
                return contactsMap;
            });

            logger.info(`JXA getAllContacts completed. Found ${Object.keys(contacts).length} contacts.`);
            contactsData = contacts;
            
            // If JXA returns empty results, try AppleScript fallback
            if (Object.keys(contacts).length === 0) {
                logger.info('JXA returned empty results, trying AppleScript fallback...');
                contactsData = await getAllContactsAppleScript();
            }
        } catch (jxaError) {
            logger.error('JXA failed, trying AppleScript fallback:', { error: jxaError });
            contactsData = await getAllContactsAppleScript();
        }

        // Cache the results
        if (Object.keys(contactsData).length > 0) {
            cache.set(contactsData, 'allContacts');
            logger.info(`Cached ${Object.keys(contactsData).length} contacts for future use.`);
        }
        
        return contactsData;
    } catch (error) {
        logger.error('Error in getAllContacts:', { error: error });
        throw new Error(`Error accessing contacts: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Backward compatibility function
async function getAllNumbers(): Promise<ContactsData> {
    return getAllContacts();
}

/**
 * Calculate fuzzy search score for a string match
 * @param searchTerm - The search term
 * @param target - The target string to match against
 * @returns Score between 0 and 1 (1 = perfect match)
 */
function calculateFuzzyScore(searchTerm: string, target: string): number {
    const search = searchTerm.toLowerCase();
    const text = target.toLowerCase();
    
    // Exact match
    if (search === text) return 1.0;
    
    // Starts with search term
    if (text.startsWith(search)) return 0.9;
    
    // Contains search term
    if (text.includes(search)) return 0.7;
    
    // Word boundary match (search term matches start of a word)
    const words = text.split(/\s+/);
    for (const word of words) {
        if (word.startsWith(search)) return 0.8;
        if (word.includes(search)) return 0.6;
    }
    
    // Fuzzy character matching (simplified Levenshtein distance approach)
    let matches = 0;
    let searchIndex = 0;
    for (let i = 0; i < text.length && searchIndex < search.length; i++) {
        if (text[i] === search[searchIndex]) {
            matches++;
            searchIndex++;
        }
    }
    
    if (matches === search.length) {
        return 0.5 * (matches / text.length);
    }
    
    return 0;
}

/**
 * Perform fuzzy search across all contact fields
 * @param searchTerm - The term to search for
 * @param maxResults - Maximum number of results to return
 * @returns Array of fuzzy search results sorted by score
 */
async function fuzzySearchContacts(searchTerm: string, maxResults: number = 10): Promise<FuzzySearchResult[]> {
    try {
        const sanitizedTerm = validateContactName(searchTerm);
        logger.info(`Starting fuzzy search for: ${escapeForLogging(sanitizedTerm)}`);
        
        const allContacts = await getAllContacts();
        const results: FuzzySearchResult[] = [];
        
        for (const [contactName, contactInfo] of Object.entries(allContacts)) {
            // Search by name
            const nameScore = calculateFuzzyScore(sanitizedTerm, contactInfo.name);
            if (nameScore > 0.3) {
                results.push({
                    contact: contactInfo,
                    score: nameScore,
                    matchType: 'name',
                    matchValue: contactInfo.name
                });
            }
            
            // Search by email
            for (const email of contactInfo.emails) {
                const emailScore = calculateFuzzyScore(sanitizedTerm, email);
                if (emailScore > 0.3) {
                    results.push({
                        contact: contactInfo,
                        score: emailScore * 0.9, // Slightly lower weight for email matches
                        matchType: 'email',
                        matchValue: email
                    });
                }
            }
            
            // Search by phone (less common but still useful)
            for (const phone of contactInfo.phones) {
                const phoneScore = calculateFuzzyScore(sanitizedTerm, phone);
                if (phoneScore > 0.5) { // Higher threshold for phone matches
                    results.push({
                        contact: contactInfo,
                        score: phoneScore * 0.8,
                        matchType: 'phone',
                        matchValue: phone
                    });
                }
            }
        }
        
        // Sort by score descending and remove duplicates (keep highest scoring match per contact)
        const uniqueResults = new Map<string, FuzzySearchResult>();
        for (const result of results) {
            const existing = uniqueResults.get(result.contact.name);
            if (!existing || result.score > existing.score) {
                uniqueResults.set(result.contact.name, result);
            }
        }
        
        const sortedResults = Array.from(uniqueResults.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
        
        logger.info(`Fuzzy search found ${sortedResults.length} results`);
        return sortedResults;
    } catch (error) {
        logger.error('Error in fuzzy search:', { error: error });
        return [];
    }
}

/**
 * Search for contacts by name or email with fuzzy matching
 * @param searchTerm - Name or email to search for
 * @returns Array of matching contacts
 */
async function searchContacts(searchTerm: string): Promise<ContactInfo[]> {
    try {
        const results = await fuzzySearchContacts(searchTerm, 10);
        return results.map(r => r.contact);
    } catch (error) {
        logger.error('Error in searchContacts:', { error: error });
        throw new Error(`Error searching contacts: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Search for a contact by email address with fuzzy matching
 * @param email - Email address to search for
 * @returns Array of matching contacts
 */
async function findContactByEmail(email: string): Promise<ContactInfo[]> {
    try {
        const sanitizedEmail = validateEmail(email);
        logger.info(`Starting email search for: ${escapeForLogging(sanitizedEmail)}`);
        
        const allContacts = await getAllContacts();
        const results: ContactInfo[] = [];
        
        for (const contactInfo of Object.values(allContacts)) {
            for (const contactEmail of contactInfo.emails) {
                if (contactEmail.toLowerCase().includes(sanitizedEmail.toLowerCase())) {
                    results.push(contactInfo);
                    break; // Don't add the same contact multiple times
                }
            }
        }
        
        logger.info(`Email search found ${results.length} results`);
        return results;
    } catch (error) {
        logger.error('Error in findContactByEmail:', { error: error });
        throw new Error(`Error finding contact by email: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function findNumber(name: string) {
    try {
        // Use the new fuzzy search to find contacts and return their phone numbers
        const contacts = await searchContacts(name);
        
        if (contacts.length === 0) {
            return [];
        }
        
        // Return phone numbers from the best match
        return contacts[0].phones;
    } catch (error) {
        logger.error('Error in findNumber:', { error: error });
        throw new Error(`Error finding contact: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Updated phone search to work with new contact structure
 */

/**
 * Normalize phone number for comparison by removing formatting characters
 * This handles common phone number formats and international numbers
 */
function normalizePhoneNumber(phoneNumber: string): string[] {
    // Remove all non-digit and non-plus characters
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    
    // Generate various normalized formats for comparison
    const formats: string[] = [cleaned];
    
    // Add format without country code if it starts with +1
    if (cleaned.startsWith('+1')) {
        formats.push(cleaned.substring(2));
    }
    
    // Add format with +1 if it doesn't start with + and looks like US number
    if (!cleaned.startsWith('+') && cleaned.length === 10) {
        formats.push(`+1${cleaned}`);
    }
    
    // Add format with just + prefix
    if (!cleaned.startsWith('+') && cleaned.length > 0) {
        formats.push(`+${cleaned}`);
    }
    
    return [...new Set(formats)]; // Remove duplicates
}

/**
 * Optimized function to find contact by phone number using cache-first approach
 * Checks cache first for fast lookup, falls back to direct JXA search only when needed
 */
async function findContactByPhoneOptimized(phoneNumber: string): Promise<string | null> {
    try {
        // Validate and sanitize input
        const sanitizedPhoneNumber = validatePhoneNumber(phoneNumber);
        logger.info(`Starting optimized findContactByPhone for: ${escapeForLogging(sanitizedPhoneNumber)}`);
        
        if (!await checkContactsAccess()) {
            return null;
        }

        // Get normalized phone number formats for comparison
        const searchNumbers = normalizePhoneNumber(sanitizedPhoneNumber);
        logger.info(`Searching for phone numbers: ${searchNumbers.join(', ')}`);

        // Try cache first (fast lookup)
        logger.info('Checking cache for phone search...');
        const cacheResult = await findContactByPhoneCachedSearch(searchNumbers);
        if (cacheResult) {
            logger.info(`Cache hit! Found contact: ${cacheResult}`);
            return cacheResult;
        }

        // Cache miss - fallback to direct JXA search (slower but comprehensive)
        logger.info('Cache miss, falling back to direct JXA search...');
        try {
            logger.info('Running direct JXA phone search...');
            const foundContact: ContactSearchResult | null = await run((searchFormats: string[]) => {
                const Contacts = Application('Contacts');
                const people = Contacts.people();
                
                console.log(`Searching ${people.length} contacts for phone numbers: ${searchFormats.join(', ')}`);
                
                for (let i = 0; i < people.length; i++) {
                    try {
                        const person = people[i];
                        const phones = person.phones();
                        
                        // Check each phone number for this contact
                        for (let j = 0; j < phones.length; j++) {
                            const phoneValue = phones[j].value();
                            const normalizedPhone = phoneValue.replace(/[^0-9+]/g, '');
                            
                            // Check if any of our search formats match this phone number
                            for (const searchNumber of searchFormats) {
                                if (normalizedPhone === searchNumber || 
                                    normalizedPhone === `+${searchNumber}` || 
                                    normalizedPhone === `+1${searchNumber}` ||
                                    `+1${normalizedPhone}` === searchNumber) {
                                    
                                    const personName = person.name();
                                    console.log(`Found match: ${personName} has phone ${phoneValue}`);
                                    
                                    // Return comprehensive contact info
                                    const allPhones = phones.map((phone: any) => phone.value());
                                    const emails = person.emails();
                                    const allEmails = emails.map((email: any) => email.value());
                                    const addresses = person.addresses();
                                    const allAddresses = addresses.map((addr: any) => {
                                        try {
                                            const formatted = addr.formattedAddress();
                                            return formatted ? formatted.replace(/\n/g, ' ').trim() : '';
                                        } catch {
                                            return '';
                                        }
                                    }).filter((a: string) => a);
                                    
                                    return { 
                                        name: personName, 
                                        phones: allPhones, 
                                        emails: allEmails, 
                                        addresses: allAddresses 
                                    };
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`Error processing contact ${i}:`, error);
                        // Skip contacts that can't be processed
                    }
                }
                
                console.log("No matching contact found via direct search");
                return null;
            }, searchNumbers);

            if (foundContact && foundContact.name) {
                logger.info(`Direct JXA search found: ${foundContact.name}`);
                
                // Cache the successful result for future lookups
                const contactInfo: ContactInfo = {
                    name: foundContact.name,
                    phones: foundContact.phones,
                    emails: foundContact.emails,
                    addresses: foundContact.addresses
                };
                await cacheContactSearchResult(contactInfo);
                
                return foundContact.name;
            }
        } catch (jxaError) {
            logger.error('Direct JXA phone search failed:', { error: jxaError });
        }

        logger.info('No contact found via any search method');
        return null;
        
    } catch (error) {
        logger.error('Error in findContactByPhoneOptimized:', { error: error });
        return null;
    }
}

/**
 * Cache-only phone search - only searches existing cached data
 * Returns null if no cache exists or no match found in cache
 */
async function findContactByPhoneCachedSearch(searchNumbers: string[]): Promise<string | null> {
    try {
        // Only search cache - don't load fresh data if cache is empty
        const cache = getContactCache();
        const allContacts = cache.get('allContacts');
        
        if (!allContacts) {
            logger.info('No cached contacts available for search');
            return null;
        }
        
        logger.info('Searching cached contacts...');
        
        // Look for a match in cached data
        for (const [name, contactInfo] of Object.entries(allContacts)) {
            const normalizedNumbers = contactInfo.phones.map(num => num.replace(/[^0-9+]/g, ''));
            
            // Check if any cached phone numbers match our search numbers
            for (const searchNumber of searchNumbers) {
                if (normalizedNumbers.some(num => 
                    num === searchNumber || 
                    num === `+${searchNumber}` || 
                    num === `+1${searchNumber}` ||
                    `+1${num}` === searchNumber
                )) {
                    logger.info(`Found match in cache: ${name}`);
                    return name;
                }
            }
        }

        logger.info('No match found in cached search');
        return null;
    } catch (error) {
        logger.error('Cached phone search failed:', { error: error });
        return null;
    }
}

async function findContactByPhone(phoneNumber: string): Promise<string | null> {
    try {
        // Use the new optimized version
        return await findContactByPhoneOptimized(phoneNumber);
    } catch (error) {
        logger.error('Error in findContactByPhone:', { error: error });
        return null;
    }
}

async function testContactsAccess(): Promise<{ success: boolean; message: string; contactCount?: number }> {
    try {
        logger.info('Testing contacts access...');
        
        // Test basic AppleScript access
        const contactCount = await runAppleScript(`
tell application "Contacts"
    count every person
end tell`);
        
        const count = Number(contactCount);
        
        if (count > 0) {
            return { 
                success: true, 
                message: `Successfully accessed ${count} contacts.`,
                contactCount: count
            };
        } else {
            return { 
                success: false, 
                message: "No contacts found. Your address book might be empty." 
            };
        }
    } catch (error) {
        return { 
            success: false, 
            message: `Cannot access Contacts app. Error: ${error instanceof Error ? error.message : String(error)}. Please check System Preferences > Security & Privacy > Privacy > Contacts and ensure this application has permission.`
        };
    }
}

/**
 * Get current cache statistics and configuration
 */
async function getCacheInfo(): Promise<{ stats: any; config: any }> {
    const cache = getContactCache();
    return {
        stats: cache.getStats(),
        config: cache.getConfig()
    };
}

/**
 * Manually invalidate the contacts cache
 */
async function invalidateCache(): Promise<void> {
    const cache = getContactCache();
    cache.invalidate();
    logger.info('Contact cache manually invalidated');
}

/**
 * Update cache configuration
 */
async function updateCacheConfig(config: any): Promise<void> {
    const cache = getContactCache();
    cache.updateConfig(config);
    logger.info('Cache configuration updated');
}

/**
 * Cache the result of a successful contact search to improve future lookup performance
 */
async function cacheContactSearchResult(contactInfo: ContactInfo): Promise<void> {
    try {
        const cache = getContactCache();
        let existingData = cache.get('allContacts');
        
        if (!existingData) {
            // Create new cache entry with just this contact
            existingData = {};
        }
        
        // Add or update this contact in the cache
        existingData[contactInfo.name] = contactInfo;
        
        // Save back to cache
        cache.set(existingData, 'allContacts');
        
        logger.info(`📞 Cached contact search result: ${contactInfo.name} with ${contactInfo.phones.length} phones, ${contactInfo.emails.length} emails, ${contactInfo.addresses.length} addresses`);
    } catch (error) {
        logger.error('Failed to cache contact search result:', { error: error });
        // Don't throw - caching failure shouldn't break the search
    }
}

export default { 
    getAllNumbers,
    getAllContacts,
    findNumber, 
    findContactByPhone,
    searchContacts,
    findContactByEmail,
    fuzzySearchContacts,
    testContactsAccess,
    getCacheInfo,
    invalidateCache,
    updateCacheConfig
};

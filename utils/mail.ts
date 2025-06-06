import { run } from "@jxa/run";
import { runAppleScript } from "run-applescript";

async function checkMailAccess(): Promise<boolean> {
  try {
    // First check if Mail is running
    const isRunning = await runAppleScript(`
tell application "System Events"
    return application process "Mail" exists
end tell`);

    if (isRunning !== "true") {
      console.error("Mail app is not running, attempting to launch...");
      try {
        await runAppleScript(`
tell application "Mail" to activate
delay 2`);
      } catch (activateError) {
        console.error("Error activating Mail app:", activateError);
        throw new Error(
          "Could not activate Mail app. Please start it manually.",
        );
      }
    }

    // Try to get the count of mailboxes as a simple test
    try {
      await runAppleScript(`
tell application "Mail"
    count every mailbox
end tell`);
      return true;
    } catch (mailboxError) {
      console.error("Error accessing mailboxes:", mailboxError);

      // Try an alternative check
      try {
        const mailVersion = await runAppleScript(`
tell application "Mail"
    return its version
end tell`);
        console.error("Mail version:", mailVersion);
        return true;
      } catch (versionError) {
        console.error("Error getting Mail version:", versionError);
        throw new Error(
          "Mail app is running but cannot access mailboxes. Please check permissions and configuration.",
        );
      }
    }
  } catch (error) {
    console.error("Mail access check failed:", error);
    throw new Error(
      `Cannot access Mail app. Please make sure Mail is running and properly configured. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

interface EmailMessage {
  subject: string;
  sender: string;
  dateSent: string;
  content: string;
  isRead: boolean;
  mailbox: string;
  messageId?: string;
  accountName?: string;
}

interface EmailSearchResult {
  email: EmailMessage;
  score: number;
  matchType: 'subject' | 'sender' | 'content' | 'combined';
  matchValue: string;
}

interface SearchOptions {
  searchTerm?: string;
  sender?: string;
  subject?: string;
  content?: string;
  account?: string;
  mailbox?: string;
  limit?: number;
  fuzzy?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Calculate fuzzy search score for email matching
 * @param searchTerm - The search term
 * @param target - The target string to match against
 * @returns Score between 0 and 1 (1 = perfect match)
 */
function calculateEmailScore(searchTerm: string, target: string): number {
  if (!target || !searchTerm) return 0;
  
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
  
  // Email-specific matching for sender addresses
  if (text.includes('@') && search.includes('@')) {
    const [searchUser, searchDomain] = search.split('@');
    const [targetUser, targetDomain] = text.split('@');
    
    if (searchDomain && targetDomain && targetDomain.includes(searchDomain)) {
      return 0.5;
    }
    if (searchUser && targetUser && targetUser.includes(searchUser)) {
      return 0.5;
    }
  }
  
  // Fuzzy character matching
  let matches = 0;
  let searchIndex = 0;
  for (let i = 0; i < text.length && searchIndex < search.length; i++) {
    if (text[i] === search[searchIndex]) {
      matches++;
      searchIndex++;
    }
  }
  
  if (matches === search.length) {
    return 0.3 * (matches / text.length);
  }
  
  return 0;
}

/**
 * Enhanced email search with multiple criteria support
 */
async function searchMailsAdvanced(options: SearchOptions): Promise<EmailSearchResult[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const limit = options.limit || 20;
    const results: EmailSearchResult[] = [];
    
    // Build search criteria for Mail app's native search
    let searchCriteria = '';
    if (options.searchTerm) {
      searchCriteria = options.searchTerm;
    } else if (options.content) {
      searchCriteria = options.content;
    } else if (options.subject) {
      searchCriteria = options.subject;
    } else if (options.sender) {
      searchCriteria = options.sender;
    }
    
    if (!searchCriteria) {
      return [];
    }
    
    // Use Mail app's native search functionality with proper delimited output
    const escapedSearch = searchCriteria.replace(/"/g, '\\"');
    const script = `
tell application "Mail"
    set searchResults to {}
    
    try
        -- Search across all accounts and mailboxes
        set allAccounts to every account
        repeat with currentAccount in allAccounts
            try
                set accountName to name of currentAccount
                set allMailboxes to every mailbox of currentAccount
                
                repeat with currentMailbox in allMailboxes
                    try
                        set mailboxName to name of currentMailbox
                        
                        -- Search for messages containing the search term
                        set searchMessages to (every message of currentMailbox whose (content contains "${escapedSearch}" or subject contains "${escapedSearch}" or sender contains "${escapedSearch}"))
                        
                        repeat with msg in searchMessages
                            try
                                set msgSubject to subject of msg
                                if msgSubject is missing value then set msgSubject to "No Subject"
                                
                                set msgSender to sender of msg as string
                                if msgSender is missing value then set msgSender to "Unknown Sender"
                                
                                set msgDate to date sent of msg as string
                                set msgRead to read status of msg
                                set msgId to message id of msg
                                if msgId is missing value then set msgId to ""
                                
                                -- Get content safely
                                set msgContent to ""
                                try
                                    set fullContent to content of msg
                                    if fullContent is not missing value then
                                        if length of fullContent > 500 then
                                            set msgContent to (text 1 thru 500 of fullContent) & "..."
                                        else
                                            set msgContent to fullContent
                                        end if
                                    else
                                        set msgContent to "[Content not available]"
                                    end if
                                on error
                                    set msgContent to "[Content not available]"
                                end try
                                
                                -- Format as delimited string for easier parsing
                                set msgInfo to "EMAIL_START|" & msgSubject & "|" & msgSender & "|" & msgDate & "|" & msgRead & "|" & mailboxName & "|" & accountName & "|" & msgId & "|" & msgContent & "|EMAIL_END"
                                set end of searchResults to msgInfo
                                
                                if (count of searchResults) >= ${limit * 2} then exit repeat
                            on error
                                -- Skip problematic messages
                            end try
                        end repeat
                        
                        if (count of searchResults) >= ${limit * 2} then exit repeat
                    on error
                        -- Skip problematic mailboxes  
                    end try
                end repeat
                
                if (count of searchResults) >= ${limit * 2} then exit repeat
            on error
                -- Skip problematic accounts
            end try
        end repeat
        
        return searchResults
    on error e
        return {"ERROR: " & e}
    end try
end tell`;

    const asResult = await runAppleScript(script);
    
    if (asResult && typeof asResult === 'string') {
      // Parse the improved AppleScript result
      const emails = parseDelimitedEmailResult(asResult);
      
      // Apply scoring and filtering
      for (const email of emails) {
        const searchResults = evaluateEmailMatch(email, options);
        if (searchResults.length > 0) {
          results.push(...searchResults);
        }
      }
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
  } catch (error) {
    console.error("Error in searchMailsAdvanced:", error);
    throw new Error(
      `Error in advanced email search: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse delimited email result into structured data (new format)
 */
function parseDelimitedEmailResult(asResult: string): EmailMessage[] {
  const emails: EmailMessage[] = [];
  
  try {
    // Split the result into individual email entries
    const emailMatches = asResult.match(/EMAIL_START\|.*?\|EMAIL_END/g);
    
    if (emailMatches) {
      for (const match of emailMatches) {
        try {
          // Remove the EMAIL_START and EMAIL_END markers
          const cleaned = match.replace(/^EMAIL_START\|/, '').replace(/\|EMAIL_END$/, '');
          const parts = cleaned.split('|');
          
          if (parts.length >= 8) {
            const [subject, sender, dateSent, isRead, mailbox, accountName, messageId, ...contentParts] = parts;
            const content = contentParts.join('|'); // Rejoin in case content had pipe characters
            
            emails.push({
              subject: subject || "No subject",
              sender: sender || "Unknown sender", 
              dateSent: dateSent || new Date().toString(),
              content: content || "[Content not available]",
              isRead: isRead === "true",
              mailbox: mailbox || "Unknown mailbox",
              messageId: messageId || "",
              accountName: accountName || ""
            });
          }
        } catch (parseError) {
          console.error("Error parsing email match:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error parsing delimited AppleScript result:", error);
  }
  
  return emails;
}

/**
 * Parse AppleScript email result into structured data (legacy format)
 */
function parseAppleScriptEmailResult(asResult: string): EmailMessage[] {
  const emails: EmailMessage[] = [];
  
  try {
    // Try to parse as structured data
    const matches = asResult.match(/\{[^}]+\}/g);
    if (matches) {
      for (const match of matches) {
        try {
          const props = match.substring(1, match.length - 1).split(',');
          const emailData: { [key: string]: string } = {};

          for (const prop of props) {
            const parts = prop.split(':');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const value = parts.slice(1).join(':').trim();
              emailData[key] = value;
            }
          }

          if (emailData.subject || emailData.sender) {
            emails.push({
              subject: emailData.subject || "No subject",
              sender: emailData.sender || "Unknown sender",
              dateSent: emailData.dateSent || new Date().toString(),
              content: emailData.content || "[Content not available]",
              isRead: emailData.isRead === "true",
              mailbox: emailData.mailbox || "Unknown mailbox",
              messageId: emailData.messageId,
              accountName: emailData.account
            });
          }
        } catch (parseError) {
          console.error("Error parsing email match:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error parsing AppleScript result:", error);
  }
  
  return emails;
}

/**
 * Evaluate how well an email matches search criteria
 */
function evaluateEmailMatch(email: EmailMessage, options: SearchOptions): EmailSearchResult[] {
  const results: EmailSearchResult[] = [];
  const minScore = options.fuzzy ? 0.3 : 0.7;
  
  // General search term matching
  if (options.searchTerm) {
    const subjectScore = calculateEmailScore(options.searchTerm, email.subject);
    const senderScore = calculateEmailScore(options.searchTerm, email.sender);
    const contentScore = calculateEmailScore(options.searchTerm, email.content);
    
    const maxScore = Math.max(subjectScore, senderScore, contentScore);
    if (maxScore >= minScore) {
      let matchType: 'subject' | 'sender' | 'content' | 'combined' = 'combined';
      let matchValue = options.searchTerm;
      
      if (subjectScore === maxScore) matchType = 'subject';
      else if (senderScore === maxScore) matchType = 'sender';
      else if (contentScore === maxScore) matchType = 'content';
      
      results.push({
        email,
        score: maxScore,
        matchType,
        matchValue
      });
    }
  }
  
  // Specific sender matching
  if (options.sender) {
    const senderScore = calculateEmailScore(options.sender, email.sender);
    if (senderScore >= minScore) {
      results.push({
        email,
        score: senderScore,
        matchType: 'sender',
        matchValue: options.sender
      });
    }
  }
  
  // Specific subject matching
  if (options.subject) {
    const subjectScore = calculateEmailScore(options.subject, email.subject);
    if (subjectScore >= minScore) {
      results.push({
        email,
        score: subjectScore,
        matchType: 'subject',
        matchValue: options.subject
      });
    }
  }
  
  // Specific content matching
  if (options.content) {
    const contentScore = calculateEmailScore(options.content, email.content);
    if (contentScore >= minScore) {
      results.push({
        email,
        score: contentScore,
        matchType: 'content',
        matchValue: options.content
      });
    }
  }
  
  // Account/mailbox filtering
  if (options.account && email.accountName && !email.accountName.toLowerCase().includes(options.account.toLowerCase())) {
    return [];
  }
  
  if (options.mailbox && !email.mailbox.toLowerCase().includes(options.mailbox.toLowerCase())) {
    return [];
  }
  
  return results;
}

/**
 * Search emails by sender with fuzzy matching
 */
async function searchBySender(sender: string, limit = 10, fuzzy = true): Promise<EmailMessage[]> {
  const searchResults = await searchMailsAdvanced({
    sender,
    limit,
    fuzzy
  });
  
  return searchResults.map(result => result.email);
}

/**
 * Search emails by content with fuzzy matching
 */
async function searchByContent(content: string, limit = 10, fuzzy = true): Promise<EmailMessage[]> {
  const searchResults = await searchMailsAdvanced({
    content,
    limit,
    fuzzy
  });
  
  return searchResults.map(result => result.email);
}

/**
 * Search emails by subject with fuzzy matching
 */
async function searchBySubject(subject: string, limit = 10, fuzzy = true): Promise<EmailMessage[]> {
  const searchResults = await searchMailsAdvanced({
    subject,
    limit,
    fuzzy
  });
  
  return searchResults.map(result => result.email);
}

async function getUnreadMails(limit = 10): Promise<EmailMessage[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    // First, try with AppleScript which might be more reliable for this case
    try {
      const script = `
tell application "Mail"
    set allMailboxes to every mailbox
    set resultList to {}

    repeat with m in allMailboxes
        try
            set unreadMessages to (messages of m whose read status is false)
            if (count of unreadMessages) > 0 then
                set msgLimit to ${limit}
                if (count of unreadMessages) < msgLimit then
                    set msgLimit to (count of unreadMessages)
                end if

                repeat with i from 1 to msgLimit
                    try
                        set currentMsg to item i of unreadMessages
                        set msgData to {subject:(subject of currentMsg), sender:(sender of currentMsg), ¬
                                        date:(date sent of currentMsg) as string, mailbox:(name of m)}

                        try
                            set msgContent to content of currentMsg
                            if length of msgContent > 500 then
                                set msgContent to (text 1 thru 500 of msgContent) & "..."
                            end if
                            set msgData to msgData & {content:msgContent}
                        on error
                            set msgData to msgData & {content:"[Content not available]"}
                        end try

                        set end of resultList to msgData
                    end try
                end repeat

                if (count of resultList) ≥ ${limit} then exit repeat
            end if
        end try
    end repeat

    return resultList
end tell`;

      const asResult = await runAppleScript(script);

      // If we got results, parse them
      if (asResult && asResult.toString().trim().length > 0) {
        try {
          // Try to parse as JSON if the result looks like JSON
          if (asResult.startsWith("{") || asResult.startsWith("[")) {
            const parsedResults = JSON.parse(asResult);
            if (Array.isArray(parsedResults) && parsedResults.length > 0) {
              return parsedResults.map((msg) => ({
                subject: msg.subject || "No subject",
                sender: msg.sender || "Unknown sender",
                dateSent: msg.date || new Date().toString(),
                content: msg.content || "[Content not available]",
                isRead: false, // These are all unread by definition
                mailbox: msg.mailbox || "Unknown mailbox",
              }));
            }
          }

          // If it's not in JSON format, try to parse the plist/record format
          const parsedEmails: EmailMessage[] = [];

          // Very simple parsing for the record format that AppleScript might return
          // This is a best-effort attempt and might not be perfect
          const matches = asResult.match(/\{([^}]+)\}/g);
          if (matches && matches.length > 0) {
            for (const match of matches) {
              try {
                // Parse key-value pairs
                const props = match.substring(1, match.length - 1).split(",");
                const emailData: { [key: string]: string } = {};

                for (const prop of props) {
                  const parts = prop.split(":");
                  if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(":").trim();
                    emailData[key] = value;
                  }
                }

                if (emailData.subject || emailData.sender) {
                  parsedEmails.push({
                    subject: emailData.subject || "No subject",
                    sender: emailData.sender || "Unknown sender",
                    dateSent: emailData.date || new Date().toString(),
                    content: emailData.content || "[Content not available]",
                    isRead: false,
                    mailbox: emailData.mailbox || "Unknown mailbox",
                  });
                }
              } catch (parseError) {
                console.error("Error parsing email match:", parseError);
              }
            }
          }

          if (parsedEmails.length > 0) {
            return parsedEmails;
          }
        } catch (parseError) {
          console.error("Error parsing AppleScript result:", parseError);
          // If parsing failed, continue to the JXA approach
        }
      }

      // If the raw result contains useful info but parsing failed
      if (
        asResult.includes("subject") &&
        asResult.includes("sender")
      ) {
        console.error("Returning raw AppleScript result for debugging");
        return [
          {
            subject: "Raw AppleScript Output",
            sender: "Mail System",
            dateSent: new Date().toString(),
            content: `Could not parse Mail data properly. Raw output: ${asResult}`,
            isRead: false,
            mailbox: "Debug",
          },
        ];
      }
    } catch (asError) {
      // Continue to JXA approach as fallback
    }

    console.error("Trying JXA approach for unread emails...");
    // Check Mail accounts as a different approach
    const accounts = await runAppleScript(`
tell application "Mail"
    set accts to {}
    repeat with a in accounts
        set end of accts to name of a
    end repeat
    return accts
end tell`);
    console.error("Available accounts:", accounts);

    // Try using direct AppleScript to check for unread messages across all accounts
    const unreadInfo = await runAppleScript(`
tell application "Mail"
    set unreadInfo to {}
    repeat with m in every mailbox
        try
            set unreadCount to count (messages of m whose read status is false)
            if unreadCount > 0 then
                set end of unreadInfo to {name of m, unreadCount}
            end if
        end try
    end repeat
    return unreadInfo
end tell`);
    console.error("Mailboxes with unread messages:", unreadInfo);

    // Fallback to JXA approach
    const unreadMails: EmailMessage[] = await run((limit: number) => {
      const Mail = Application("Mail");
      const results = [];

      try {
        const accounts = Mail.accounts();

        for (const account of accounts) {
          try {
            const accountName = account.name();
            try {
              const accountMailboxes = account.mailboxes();

              for (const mailbox of accountMailboxes) {
                try {
                  const boxName = mailbox.name();

                  // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
                  let unreadMessages;
                  try {
                    unreadMessages = mailbox.messages.whose({
                      readStatus: false,
                    })();

                    const count = Math.min(
                      unreadMessages.length,
                      limit - results.length,
                    );
                    for (let i = 0; i < count; i++) {
                      try {
                        const msg = unreadMessages[i];
                        results.push({
                          subject: msg.subject(),
                          sender: msg.sender(),
                          dateSent: msg.dateSent().toString(),
                          content: msg.content()
                            ? msg.content().substring(0, 500)
                            : "[No content]",
                          isRead: false,
                          mailbox: `${accountName} - ${boxName}`,
                        });
                      } catch (msgError) {}
                    }
                  } catch (unreadError) {}
                } catch (boxError) {}

                if (results.length >= limit) {
                  break;
                }
              }
            } catch (mbError) {}

            if (results.length >= limit) {
              break;
            }
          } catch (accError) {}
        }
      } catch (error) {}

      return results;
    }, limit);

    return unreadMails;
  } catch (error) {
    console.error("Error in getUnreadMails:", error);
    throw new Error(
      `Error accessing mail: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function searchMails(
  searchTerm: string,
  limit = 10,
): Promise<EmailMessage[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    // Ensure Mail app is running
    await runAppleScript(`
if application "Mail" is not running then
    tell application "Mail" to activate
    delay 2
end if`);

    // First try the AppleScript approach which might be more reliable
    try {
      const script = `
tell application "Mail"
    set searchString to "${searchTerm.replace(/"/g, '\\"')}"
    set foundMsgs to {}
    set allBoxes to every mailbox

    repeat with currentBox in allBoxes
        try
            set boxMsgs to (messages of currentBox whose (subject contains searchString) or (content contains searchString))
            set foundMsgs to foundMsgs & boxMsgs
            if (count of foundMsgs) ≥ ${limit} then exit repeat
        end try
    end repeat

    set resultList to {}
    set msgCount to (count of foundMsgs)
    if msgCount > ${limit} then set msgCount to ${limit}

    repeat with i from 1 to msgCount
        try
            set currentMsg to item i of foundMsgs
            set msgInfo to {subject:subject of currentMsg, sender:sender of currentMsg, ¬
                            date:(date sent of currentMsg) as string, isRead:read status of currentMsg, ¬
                            boxName:name of (mailbox of currentMsg)}
            set end of resultList to msgInfo
        end try
    end repeat

    return resultList
end tell`;

      const asResult = await runAppleScript(script);

      // If we got results, parse them
      if (asResult && asResult.length > 0) {
        try {
          const parsedResults = JSON.parse(asResult);
          if (Array.isArray(parsedResults) && parsedResults.length > 0) {
            return parsedResults.map((msg) => ({
              subject: msg.subject || "No subject",
              sender: msg.sender || "Unknown sender",
              dateSent: msg.date || new Date().toString(),
              content: "[Content not available through AppleScript method]",
              isRead: msg.isRead || false,
              mailbox: msg.boxName || "Unknown mailbox",
            }));
          }
        } catch (parseError) {
          console.error("Error parsing AppleScript result:", parseError);
          // Continue to JXA approach if parsing fails
        }
      }
    } catch (asError) {
      // Continue to JXA approach
    }

    // JXA approach as fallback
    const searchResults: EmailMessage[] = await run(
      (searchTerm: string, limit: number) => {
        const Mail = Application("Mail");
        const results = [];

        try {
          const mailboxes = Mail.mailboxes();

          for (const mailbox of mailboxes) {
            try {
              // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
              let messages;
              try {
                messages = mailbox.messages.whose({
                  _or: [
                    { subject: { _contains: searchTerm } },
                    { content: { _contains: searchTerm } },
                  ],
                })();

                const count = Math.min(messages.length, limit);

                for (let i = 0; i < count; i++) {
                  try {
                    const msg = messages[i];
                    results.push({
                      subject: msg.subject(),
                      sender: msg.sender(),
                      dateSent: msg.dateSent().toString(),
                      content: msg.content()
                        ? msg.content().substring(0, 500)
                        : "[No content]", // Limit content length
                      isRead: msg.readStatus(),
                      mailbox: mailbox.name(),
                    });
                  } catch (msgError) {}
                }

                if (results.length >= limit) {
                  break;
                }
              } catch (queryError) {
              }
            } catch (boxError) {}
          }
        } catch (mbError) {}

        return results.slice(0, limit);
      },
      searchTerm,
      limit,
    );

    return searchResults;
  } catch (error) {
    console.error("Error in searchMails:", error);
    throw new Error(
      `Error searching mail: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function sendMail(
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
): Promise<string | undefined> {
  try {
    if (!(await checkMailAccess())) {
      throw new Error("Could not access Mail app");
    }

    // Ensure Mail app is running
    await runAppleScript(`
if application "Mail" is not running then
    tell application "Mail" to activate
    delay 2
end if`);

    // Escape special characters in strings for AppleScript
    const escapedTo = to.replace(/"/g, '\\"');
    const escapedSubject = subject.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"');
    const escapedCc = cc ? cc.replace(/"/g, '\\"') : "";
    const escapedBcc = bcc ? bcc.replace(/"/g, '\\"') : "";

    let script = `
tell application "Mail"
    set newMessage to make new outgoing message with properties {subject:"${escapedSubject}", content:"${escapedBody}", visible:true}
    tell newMessage
        make new to recipient with properties {address:"${escapedTo}"}
`;

    if (cc) {
      script += `        make new cc recipient with properties {address:"${escapedCc}"}\n`;
    }

    if (bcc) {
      script += `        make new bcc recipient with properties {address:"${escapedBcc}"}\n`;
    }

    script += `    end tell
    send newMessage
    return "success"
end tell
`;

    try {
      const result = await runAppleScript(script);
      if (result === "success") {
        return `Email sent to ${to} with subject "${subject}"`;
      // biome-ignore lint/style/noUselessElse: <explanation>
      } else {
      }
    } catch (asError) {
      console.error("Error in AppleScript send:", asError);

      const jxaResult: string = await run(
        (to, subject, body, cc, bcc) => {
          try {
            const Mail = Application("Mail");

            const msg = Mail.OutgoingMessage().make();
            msg.subject = subject;
            msg.content = body;
            msg.visible = true;

            // Add recipients
            const toRecipient = Mail.ToRecipient().make();
            toRecipient.address = to;
            msg.toRecipients.push(toRecipient);

            if (cc) {
              const ccRecipient = Mail.CcRecipient().make();
              ccRecipient.address = cc;
              msg.ccRecipients.push(ccRecipient);
            }

            if (bcc) {
              const bccRecipient = Mail.BccRecipient().make();
              bccRecipient.address = bcc;
              msg.bccRecipients.push(bccRecipient);
            }

            msg.send();
            return "JXA send completed";
          } catch (error) {
            return `JXA error: ${error}`;
          }
        },
        to,
        subject,
        body,
        cc,
        bcc,
      );

      if (jxaResult.startsWith("JXA error:")) {
        throw new Error(jxaResult);
      }

      return `Email sent to ${to} with subject "${subject}"`;
    }
  } catch (error) {
    console.error("Error in sendMail:", error);
    throw new Error(
      `Error sending mail: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getMailboxes(): Promise<string[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    // Ensure Mail app is running
    await runAppleScript(`
if application "Mail" is not running then
    tell application "Mail" to activate
    delay 2
end if`);

    const mailboxes: string[] = await run(() => {
      const Mail = Application("Mail");

      try {
        const mailboxes = Mail.mailboxes();

        if (!mailboxes || mailboxes.length === 0) {
          try {
            const result = Mail.execute({
              withObjectModel: "Mail Suite",
              withCommand: "get name of every mailbox",
            });

            if (result && result.length > 0) {
              return result;
            }
          } catch (execError) {}

          return [];
        }

        return mailboxes.map((box: unknown) => {
          try {
            return (box as { name: () => string }).name();
          } catch (nameError) {
            return "Unknown mailbox";
          }
        });
      } catch (error) {
        return [];
      }
    });

    return mailboxes;
  } catch (error) {
    console.error("Error in getMailboxes:", error);
    throw new Error(
      `Error getting mailboxes: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getAccounts(): Promise<string[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const accounts = await runAppleScript(`
tell application "Mail"
    set acctNames to {}
    repeat with a in accounts
        set end of acctNames to name of a
    end repeat
    return acctNames
end tell`);

    return accounts ? accounts.split(", ") : [];
  } catch (error) {
    console.error("Error getting accounts:", error);
    throw new Error(
      `Error getting mail accounts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getMailboxesForAccount(accountName: string): Promise<string[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const mailboxes = await runAppleScript(`
tell application "Mail"
    set boxNames to {}
    try
        set targetAccount to first account whose name is "${accountName.replace(/"/g, '\\"')}"
        set acctMailboxes to every mailbox of targetAccount
        repeat with mb in acctMailboxes
            set end of boxNames to name of mb
        end repeat
    on error errMsg
        return "Error: " & errMsg
    end try
    return boxNames
end tell`);

    if (mailboxes?.startsWith("Error:")) {
      console.error(mailboxes);
      return [];
    }

    return mailboxes ? mailboxes.split(", ") : [];
  } catch (error) {
    console.error("Error getting mailboxes for account:", error);
    throw new Error(
      `Error getting mailboxes for account ${accountName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export default {
  getUnreadMails,
  searchMails,
  searchMailsAdvanced,
  searchBySender,
  searchByContent,
  searchBySubject,
  sendMail,
  getMailboxes,
  getAccounts,
  getMailboxesForAccount,
};

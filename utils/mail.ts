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
    console.error("Error checking Mail access:", error);
    throw new Error(
      `Mail access check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Define interface for email messages
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
                isRead: false, // These are unread by definition
                mailbox: msg.mailbox || "Unknown mailbox",
              }));
            }
          }

          // Try manual parsing if JSON parse fails
          return parseMailData(asResult.toString());
        } catch (parseError) {
          console.error("Error parsing unread mails result:", parseError);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error("AppleScript error in getUnreadMails:", error);
      return [];
    }
  } catch (error) {
    console.error("Error in getUnreadMails:", error);
    throw new Error(
      `Error fetching unread mails: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getInboxMails(limit = 10): Promise<EmailMessage[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const script = `
tell application "Mail"
    set resultList to {}
    set emailCount to 0
    
    -- Try to get messages from inbox mailboxes across all accounts
    set allAccounts to every account
    
    repeat with currentAccount in allAccounts
        try
            set accountName to name of currentAccount
            
            -- Look for inbox mailboxes (could be "INBOX", "Inbox", etc.)
            set accountMailboxes to every mailbox of currentAccount
            repeat with currentMailbox in accountMailboxes
                try
                    set mailboxName to name of currentMailbox
                    
                    -- Check if this is an inbox (case insensitive)
                    if (mailboxName contains "Inbox" or mailboxName contains "INBOX" or mailboxName contains "inbox") then
                        set inboxMessages to messages of currentMailbox
                        
                        -- Get the most recent messages first
                        repeat with i from 1 to (count of inboxMessages)
                            if emailCount >= ${limit} then exit repeat
                            
                            try
                                set currentMsg to item i of inboxMessages
                                set msgSubject to subject of currentMsg
                                if msgSubject is missing value then set msgSubject to "No Subject"
                                
                                set msgSender to sender of currentMsg as string
                                if msgSender is missing value then set msgSender to "Unknown Sender"
                                
                                set msgDate to date sent of currentMsg as string
                                set msgRead to read status of currentMsg
                                
                                -- Get content safely
                                set msgContent to ""
                                try
                                    set fullContent to content of currentMsg
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
                                
                                set msgData to {subject:msgSubject, sender:msgSender, date:msgDate, ¬
                                              content:msgContent, isRead:msgRead, mailbox:mailboxName, account:accountName}
                                set end of resultList to msgData
                                set emailCount to emailCount + 1
                                
                            on error
                                -- Skip problematic messages
                            end try
                        end repeat
                    end if
                on error
                    -- Skip problematic mailboxes
                end try
            end repeat
        on error
            -- Skip problematic accounts
        end try
    end repeat
    
    return resultList
end tell`;

    const asResult = await runAppleScript(script);

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
              isRead: msg.isRead || false,
              mailbox: msg.mailbox || "Inbox",
              accountName: msg.account || "Unknown Account",
            }));
          }
        }

        // Try manual parsing if JSON parse fails
        return parseMailData(asResult.toString());
      } catch (parseError) {
        console.error("Error parsing inbox mails result:", parseError);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error("Error in getInboxMails:", error);
    throw new Error(
      `Error fetching inbox mails: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseMailData(data: string): EmailMessage[] {
  const emails: EmailMessage[] = [];
  try {
    // Parse AppleScript record format
    const records = data.match(/\{[^}]+\}/g);
    if (records) {
      for (const record of records) {
        try {
          const props = record.substring(1, record.length - 1).split(',');
          const emailData: { [key: string]: string } = {};
          
          for (const prop of props) {
            const colonIndex = prop.indexOf(':');
            if (colonIndex > 0) {
              const key = prop.substring(0, colonIndex).trim();
              const value = prop.substring(colonIndex + 1).trim();
              emailData[key] = value;
            }
          }
          
          if (emailData.subject || emailData.sender) {
            emails.push({
              subject: emailData.subject || "No subject",
              sender: emailData.sender || "Unknown sender",
              dateSent: emailData.date || new Date().toString(),
              content: emailData.content || "[Content not available]",
              isRead: emailData.isRead === "true",
              mailbox: emailData.mailbox || "Unknown mailbox",
              accountName: emailData.account || ""
            });
          }
        } catch (parseError) {
          console.error("Error parsing individual email record:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error parsing mail data:", error);
  }
  
  return emails;
}

async function searchMails(searchTerm: string, limit = 10): Promise<EmailMessage[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const script = `
tell application "Mail"
    set foundMessages to {}
    set messageCount to 0
    
    set allAccounts to every account
    repeat with currentAccount in allAccounts
        try
            set allMailboxes to every mailbox of currentAccount
            repeat with currentMailbox in allMailboxes
                try
                    set mailboxName to name of currentMailbox
                    set accountName to name of currentAccount
                    
                    -- Search messages in this mailbox
                    set searchResults to (every message of currentMailbox whose (content contains "${searchTerm}" or subject contains "${searchTerm}" or sender contains "${searchTerm}"))
                    
                    repeat with msg in searchResults
                        if messageCount >= ${limit} then exit repeat
                        
                        try
                            set msgSubject to subject of msg
                            if msgSubject is missing value then set msgSubject to "No Subject"
                            
                            set msgSender to sender of msg as string
                            if msgSender is missing value then set msgSender to "Unknown Sender"
                            
                            set msgDate to date sent of msg as string
                            set msgRead to read status of msg
                            
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
                            
                            set msgData to {subject:msgSubject, sender:msgSender, date:msgDate, ¬
                                          content:msgContent, isRead:msgRead, mailbox:mailboxName, account:accountName}
                            set end of foundMessages to msgData
                            set messageCount to messageCount + 1
                        on error
                            -- Skip problematic messages
                        end try
                    end repeat
                on error
                    -- Skip problematic mailboxes
                end try
            end repeat
        on error
            -- Skip problematic accounts
        end try
    end repeat
    
    return foundMessages
end tell`;

    const asResult = await runAppleScript(script);

    if (asResult && asResult.toString().trim().length > 0) {
      try {
        if (asResult.startsWith("{") || asResult.startsWith("[")) {
          const parsedResults = JSON.parse(asResult);
          if (Array.isArray(parsedResults) && parsedResults.length > 0) {
            return parsedResults.map((msg) => ({
              subject: msg.subject || "No subject",
              sender: msg.sender || "Unknown sender",
              dateSent: msg.date || new Date().toString(),
              content: msg.content || "[Content not available]",
              isRead: msg.isRead || false,
              mailbox: msg.mailbox || "Unknown mailbox",
              accountName: msg.account || "Unknown Account",
            }));
          }
        }

        return parseMailData(asResult.toString());
      } catch (parseError) {
        console.error("Error parsing search results:", parseError);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error("Error in searchMails:", error);
    throw new Error(
      `Error searching mails: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getMailboxes(): Promise<string[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const script = `
tell application "Mail"
    set mailboxNames to {}
    set allMailboxes to every mailbox
    repeat with m in allMailboxes
        set end of mailboxNames to (name of m)
    end repeat
    return mailboxNames
end tell`;

    const result = await runAppleScript(script);
    
    if (result && typeof result === 'string') {
      // Parse the result into an array
      const cleaned = result.replace(/[{}]/g, '').split(',').map(name => name.trim().replace(/"/g, ''));
      return cleaned.filter(name => name.length > 0);
    }
    
    return [];
  } catch (error) {
    console.error("Error getting mailboxes:", error);
    throw new Error(
      `Error fetching mailboxes: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getAccounts(): Promise<string[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const script = `
tell application "Mail"
    set accountNames to {}
    set allAccounts to every account
    repeat with a in allAccounts
        set end of accountNames to (name of a)
    end repeat
    return accountNames
end tell`;

    const result = await runAppleScript(script);
    
    if (result && typeof result === 'string') {
      // Parse the result into an array
      const cleaned = result.replace(/[{}]/g, '').split(',').map(name => name.trim().replace(/"/g, ''));
      return cleaned.filter(name => name.length > 0);
    }
    
    return [];
  } catch (error) {
    console.error("Error getting accounts:", error);
    throw new Error(
      `Error fetching accounts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getMailboxesForAccounts(accountName: string): Promise<string[]> {
  try {
    if (!(await checkMailAccess())) {
      return [];
    }

    const script = `
tell application "Mail"
    set mailboxNames to {}
    try
        set targetAccount to account "${accountName}"
        set accountMailboxes to every mailbox of targetAccount
        repeat with m in accountMailboxes
            set end of mailboxNames to (name of m)
        end repeat
    on error
        return {}
    end try
    return mailboxNames
end tell`;

    const result = await runAppleScript(script);
    
    if (result && typeof result === 'string') {
      // Parse the result into an array
      const cleaned = result.replace(/[{}]/g, '').split(',').map(name => name.trim().replace(/"/g, ''));
      return cleaned.filter(name => name.length > 0);
    }
    
    return [];
  } catch (error) {
    console.error("Error getting mailboxes for account:", error);
    throw new Error(
      `Error fetching mailboxes for account: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function sendMail(to: string, subject: string, body: string, cc?: string, bcc?: string): Promise<void> {
  try {
    if (!(await checkMailAccess())) {
      throw new Error("Cannot access Mail app");
    }

    let script = `
tell application "Mail"
    set newMessage to make new outgoing message with properties {subject:"${subject}", content:"${body}"}
    tell newMessage
        make new to recipient at end of to recipients with properties {address:"${to}"}`;

    if (cc) {
      script += `
        make new cc recipient at end of cc recipients with properties {address:"${cc}"}`;
    }

    if (bcc) {
      script += `
        make new bcc recipient at end of bcc recipients with properties {address:"${bcc}"}`;
    }

    script += `
        send
    end tell
end tell`;

    await runAppleScript(script);
  } catch (error) {
    console.error("Error sending mail:", error);
    throw new Error(
      `Error sending mail: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const mailFunctions = {
  checkMailAccess,
  getUnreadMails,
  getInboxMails,
  searchMails,
  getMailboxes,
  getAccounts,
  getMailboxesForAccounts,
  sendMail,
};

export default mailFunctions;

export {
  checkMailAccess,
  getUnreadMails,
  getInboxMails,
  searchMails,
  getMailboxes,
  getAccounts,
  getMailboxesForAccounts,
  sendMail,
  type EmailMessage
};
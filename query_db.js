const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:240687@localhost:5432/linharesflow',
});

(async () => {
  try {
    await client.connect();

    // Query 1: Get the chat row
    console.log('=== CHAT QUERY ===');
    const chatResult = await client.query(
      `SELECT id, lead_id, workspace_id, assignee_id, step, status, done_at 
       FROM linharesflow.chats 
       WHERE id = $1`,
      ['d6d45ece-126f-4e0c-8042-37f4aca81bb6']
    );
    console.log(JSON.stringify(chatResult.rows, null, 2));

    if (chatResult.rows.length === 0) {
      console.log('No chat found!');
      process.exit(0);
    }

    const leadId = chatResult.rows[0].lead_id;
    console.log('\n=== LEAD QUERY ===');
    const leadResult = await client.query(
      `SELECT id, name, email, phone, workspace_id, status, deleted_at, created_at 
       FROM linharesflow.leads 
       WHERE id = $1`,
      [leadId]
    );
    console.log(JSON.stringify(leadResult.rows, null, 2));

    console.log('\n=== ALL CHATS FOR THIS LEAD ===');
    const chatsResult = await client.query(
      `SELECT id, workspace_id, assignee_id, step, status, done_at 
       FROM linharesflow.chats 
       WHERE lead_id = $1`,
      [leadId]
    );
    console.log(JSON.stringify(chatsResult.rows, null, 2));

    console.log('\n=== TOTAL NON-DELETED LEADS ===');
    const countResult = await client.query(`SELECT count(*) FROM linharesflow.leads WHERE deleted_at IS NULL`);
    console.log(JSON.stringify(countResult.rows[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();

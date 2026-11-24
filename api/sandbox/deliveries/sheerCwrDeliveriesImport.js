require("dotenv").config();
require("../../models/db");
const fs = require("fs");
const csv = require("csv-parser");
const moment = require("moment");
const DeliveredWork = require("../../models/deliveredWork");
const DeliveryLog = require("../../models/deliveryLog");
const Work = require("../../models/work");
const { ObjectId } = require("mongodb");

const clientId = "679bb25db9509c49782b2b1a";

const CSV_FILE_PATH =
  "/Users/sam/Downloads/Sheer Song-Society Level Most Recent CWR and ACK Statuses - 2026-03-09.csv";
const WORKS_JSON = "/Users/sam/Downloads/sheer-works.json";

// const headers = ['Source Database', 'Song MuMa Code', 'Song Title', 'Society Name', 'CWR Filename', 'CWR Created Timestamp', 'ACK Filename', 'ACK Processed Date', 'ACK Status Code', 'ACK Messages', 'Song Status for Partner Account', 'Song Status Category', 'Song MIXER ID', 'Refresh Date']
// const totalLines = 5,558,291;

// Each work, partner combo has one object. Different deliveries go the log array
// const deliveryLog = {
//   "clientId": "64cf839eb3c6ff250d8899c0",
//   "deliveryPartnerId": "64cf8f22af11009c51166dcb", // ObjectId
//   "workId": "64cf8bcdb22992d5d398ca1f", // ObjectId
//   "log": [
//     {
//       "deliveredWorkId": "64cf915eaf11009c5116756f", // ObjectId
//       "status": "Accepted",
//       "action": "Manual",
//       "date": "2023-08-06T12:26:06.000Z", // Date
//     }
//   ]
// }

// Mapping Logic

// 1. If Column 'CWR Filename' is not empty and Column 'ACK Processed Date' is empty
// Use Column 'Song MuMa Code' to identify the Work this row is for
// Use Column 'Society Name' to identify the Delivery Partner this row is for
// Use Column 'CWR Created Timestamp' to create a new Delivery History entry and populate the CWR Sent Date under Date
// Set the row’s Action to Delivery
// Set the Work’s Delivery Status to Delivered (can be based on the value ‘Sent’ in Column 'Song Status Category' if needed)

// 2. If Column 'CWR Filename' is not empty and Column 'ACK Processed Date' is not empty
// Follow all steps under point 1
// Use Column 'ACK Processed Date' to create a second new Delivery History entry and populate the ACK Processed Date under Date
// Set the row’s Action to Acknowledgment
// Set the Work’s Delivery Status to Accepted, Rejected or In Conflict based on the value in column 'Song Status Category'
// needs a bit more thought to map these statuses to the ones we have in Curve, as I can’t find documentation on what we can and can’t show here

// Get works using a cursor
const importDeliveries = async () => {
  const works = JSON.parse(fs.readFileSync(WORKS_JSON, "utf8"));
  console.log("Finished processing works. Total:", works.length);

  const workIdentifiers = new Map(works.map((w) => [w.identifier, w]));

  let totalLines = 0;
  const societyNamesMapping = {
    "SOUTHERN AFRICAN MUSIC RIGHTS": "68f8e825263c3fbe0c8998a0",
    "BACKOFFICE MUSIC SERVICE": "68f92b5173e03251fa00924b",
  };
  const ackDeliveryStatusesMapping = {
    Accepted: "Accepted",
    Rejected: "Rejected",
    "In Conflict": "Rejected",
    "": "Rejected",
  };

  // CSV Row sample
  //   {
  //   'Source Database': 'Sheersound',
  //   'Song MuMa Code': '3812644',
  //   'Song Title': 'BAPTISM OF THE RAFT',
  //   'Society Name': 'SOUTHERN AFRICAN MUSIC RIGHTS',
  //   'CWR Filename': 'CW190493SP_063.V21',
  //   'CWR Created Timestamp': '09:40.0',
  //   'ACK Filename': '',
  //   'ACK Processed Date': '',
  //   'ACK Status Code': 'Sent',
  //   'ACK Messages': '',
  //   'Song Status for Partner Account': 'Sent',
  //   'Song Status Category': 'Sent',
  //   'Song MIXER ID': 'SHR_MSG_201_3812644',
  //   'Refresh Date': '09/03/2026'
  // }

  const deliveryLogs = new Map();
  const deliveredWorks = new Map();

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on("data", (row) => {
        // console.log(row);
        totalLines += 1;
        if (totalLines % 100_000 === 0) {
          console.log("Lines processed:", totalLines);
        }

        const work = workIdentifiers.get(row["Song MuMa Code"]);
        if (work) {
          const deliveryPartnerId = societyNamesMapping[row["Society Name"]];
          const workId = work._id.$oid || work._id;

          // Add Delivery logs
          if (row["CWR Filename"]) {
            // TODO Create Delivered Work document for 'Delivered' and add deliveredWorkId to log
            // Delivered Works statuses need to be mapped to ackDeliveryStatusesMapping, either Delivered, Accepted or Rejected.
            // Create new documents and save to DB in bulk skipping middlewares
            // ....

            // Add delivered work
            let deliveredWork = deliveredWorks.get(`${workId}-${deliveryPartnerId}`);
            if (!deliveredWork) {
              deliveredWork = new DeliveredWork({
                clientId,
                workId: new ObjectId(workId),
                deliveryPartnerId: new ObjectId(deliveryPartnerId),
                deliveryDate: new Date(moment(row["CWR Created Timestamp"]).format()),
                messages: [],
                userCreated: true,
                createdAt: new Date(moment(row["CWR Created Timestamp"]).format()),
                updatedAt: new Date(moment(row["CWR Created Timestamp"]).format()),
              }).toJSON();
            }
            
            deliveredWork.status = "Delivered";

            deliveredWorks.set(`${workId}-${deliveryPartnerId}`, deliveredWork);

            // Add delivery log
            let delivery = deliveryLogs.get(`${workId}-${deliveryPartnerId}`);
            if (!delivery) {
              delivery = {
                clientId,
                deliveryPartnerId: new ObjectId(deliveryPartnerId),
                workId: new ObjectId(workId),
                log: [],
              };
            }

            delivery.log.push({
              deliveredWorkId: deliveredWork._id,
              status: "Delivered",
              action: "Ingestion Script",
              date: new Date(moment(row["CWR Created Timestamp"]).format()),
            });

            deliveryLogs.set(`${workId}-${deliveryPartnerId}`, delivery);
          }

          // Add Acknoledgement logs
          if (row["ACK Processed Date"]) {

            // Add delivered work
            let deliveredWork = deliveredWorks.get(`${workId}-${deliveryPartnerId}`);
            if (!deliveredWork) {
              deliveredWork = new DeliveredWork({
                clientId,
                workId: new ObjectId(workId),
                deliveryPartnerId: new ObjectId(deliveryPartnerId),
                deliveryDate: new Date(moment(row["CWR Created Timestamp"]).format()),
                messages: [],
                userCreated: true,
                createdAt: new Date(moment(row["CWR Created Timestamp"]).format()),
                updatedAt: new Date(moment(row["ACK Processed Date"]).format()),
              }).toJSON();
            }
            
            deliveredWork.status = ackDeliveryStatusesMapping[row["Song Status Category"]];
            deliveredWork.updatedAt = new Date(moment(row["ACK Processed Date"]).format()),
            
            deliveredWorks.set(`${workId}-${deliveryPartnerId}`, deliveredWork);
            

            let delivery = deliveryLogs.get(`${workId}-${deliveryPartnerId}`);
            if (!delivery) {
              delivery = {
                clientId,
                deliveryPartnerId: new ObjectId(deliveryPartnerId),
                workId: new ObjectId(workId),
                log: [],
              };
            }

            delivery.log.push({
              deliveredWorkId: deliveredWork._id,
              status: ackDeliveryStatusesMapping[row["Song Status Category"]],
              action: "Ingestion Script",
              date: new Date(moment(row["ACK Processed Date"]).format()),
            });

            deliveryLogs.set(`${workId}-${deliveryPartnerId}`, delivery);
          }

          // deliveryLogs.get(`${workId}-${deliveryPartnerId}`)?.log.length > 1 && console.log(deliveryLogs.get(`${workId}-${deliveryPartnerId}`));
        }
      })
      .on("end", () => {
        console.log("CSV file processing complete. Total Lines: ", totalLines);

        resolve();
      })
      .on("error", reject);
  });

  const BATCH_SIZE = 100_000;

  const insertInBatches = async (map, Model, label) => {
    let batch = [];
    let inserted = 0;
    for (const value of map.values()) {
      batch.push(value);
      if (batch.length === BATCH_SIZE) {
        await Model.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`${label} inserted: ${inserted} / ${map.size}`);
        batch = [];
      }
    }
    if (batch.length > 0) {
      await Model.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`${label} inserted: ${inserted} / ${map.size}`);
    }
  };

  console.log(`Inserting ${deliveredWorks.size} delivered works...`);
  await insertInBatches(deliveredWorks, DeliveredWork, "Delivered works");

  console.log(`Inserting ${deliveryLogs.size} delivery logs...`);
  await insertInBatches(deliveryLogs, DeliveryLog, "Delivery logs");

  // Group deliveredTo entries by workId
  const workDeliveries = new Map();
  for (const [key, dw] of deliveredWorks) {
    const workId = key.split('-')[0];
    if (!workDeliveries.has(workId)) workDeliveries.set(workId, []);
    workDeliveries.get(workId).push({
      deliveryPartnerId: dw.deliveryPartnerId,
      deliveredAt: dw.deliveryDate,
    });
  }

  // Bulk write deliveredTo onto work documents
  console.log(`Updating deliveredTo on ${workDeliveries.size} works...`);
  let updatedWorks = 0;
  let workBatch = [];
  for (const [workId, entries] of workDeliveries) {
    workBatch.push({
      updateOne: {
        filter: { _id: new ObjectId(workId) },
        update: { $push: { deliveredTo: { $each: entries } } },
      },
    });
    if (workBatch.length === BATCH_SIZE) {
      await Work.bulkWrite(workBatch, { ordered: false });
      updatedWorks += workBatch.length;
      console.log(`Works deliveredTo updated: ${updatedWorks} / ${workDeliveries.size}`);
      workBatch = [];
    }
  }
  if (workBatch.length) {
    await Work.bulkWrite(workBatch, { ordered: false });
    console.log(`Works deliveredTo updated: ${workDeliveries.size} / ${workDeliveries.size}`);
  }

  // Write rollback data
  const rollbackData = {
    clientId,
    partnerIds: Object.values(societyNamesMapping),
    workIds: [...workDeliveries.keys()],
  };
  fs.writeFileSync('/Users/sam/Downloads/sheer-deliveredTo-rollback.json', JSON.stringify(rollbackData, null, 2));
  console.log('Rollback data written to /Users/sam/Downloads/sheer-deliveredTo-rollback.json');
};

importDeliveries().then(() => {
  console.log("Done importing");
  process.exit(0);
});

require('dotenv').config();
require('../models/db');
const Track = require('../models/track');

/*
This script updates all tracks duration time to be in full seconds
saved as integer, without decimal value. It only updates tracks with 
existing duration field.
*/

const main = async () => {
    await Track.updateMany(
      {
        duration: { $exists: true },
      },
      [
        {
          $set: {
            duration: {
              $round: "$duration"
            }
          }
        },
      ],
    );

    console.log('script complete');
};

main();

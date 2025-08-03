
VISLOG SSP

recordings is used for storing the recordings of the VISLOG SSP system.(see DB md) - location code and ordernumber are unique.

submitdatetime is in UTC when it was submitted to the system.

status is : partial, submitted,  completed

- partial means the all the images are not uploaded yet - the order is created and the user can upload more images.
- submitted means all the images are uploaded and the order is ready to be processed.(user cannot alter the images anymore  )
- completed means the order is processed and the pdf is generated and sent to user and archived in s3


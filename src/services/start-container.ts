// // // pages/api/start-container.ts
// // import type { NextApiRequest, NextApiResponse } from "next";
// // import { ECSClient, ListTasksCommand, RunTaskCommand, DescribeTasksCommand } from "@aws-sdk/client-ecs";
// // import { EC2Client, DescribeNetworkInterfacesCommand } from "@aws-sdk/client-ec2";

// // const REGION = "ap-south-1";
// // const CLUSTER = "tts-cluster";
// // const TASK_DEFINITION = "tts-fargate-task";
// // const SUBNET = "subnet-044f83181ad6a0174";
// // const SECURITY_GROUP = "sg-0b8c9b2cb4f97de43";

// // // const ecs = new ECSClient({ region: REGION });
// // // const ec2 = new EC2Client({ region: REGION });


// // const ecs = new ECSClient({ 
// //     region: REGION, 
// //     credentials: {
// //       accessKeyId: process.env.ACCESS_KEY_ID!,
// //       secretAccessKey: process.env.SECRET_ACCESS_KEY!
// //     }
// //   });
  
// //   const ec2 = new EC2Client({ 
// //     region: REGION, 
// //     credentials: {
// //       accessKeyId: process.env.ACCESS_KEY_ID!,
// //       secretAccessKey: process.env.SECRET_ACCESS_KEY!
// //     }
// //   });  

// // async function getRunningTask() {
// //   const listResponse = await ecs.send(new ListTasksCommand({
// //     cluster: CLUSTER,
// //     family: TASK_DEFINITION, // using family to filter by task definition family
// //     desiredStatus: "RUNNING",
// //   }));
// //   if (listResponse.taskArns && listResponse.taskArns.length > 0) {
// //     const taskArn = listResponse.taskArns[0];
// //     const describeResponse = await ecs.send(new DescribeTasksCommand({
// //       cluster: CLUSTER,
// //       tasks: [taskArn],
// //     }));
// //     if (describeResponse.tasks && describeResponse.tasks.length > 0) {
// //       return describeResponse.tasks[0];
// //     }
// //   }
// //   return null;
// // }

// // async function startNewTask() {
// //   const runTaskResponse = await ecs.send(new RunTaskCommand({
// //     cluster: CLUSTER,
// //     taskDefinition: TASK_DEFINITION,
// //     launchType: "FARGATE",
// //     networkConfiguration: {
// //       awsvpcConfiguration: {
// //         subnets: [SUBNET],
// //         securityGroups: [SECURITY_GROUP],
// //         assignPublicIp: "ENABLED",
// //       },
// //     },
// //   }));
// //   if (runTaskResponse.tasks && runTaskResponse.tasks.length > 0) {
// //     return runTaskResponse.tasks[0];
// //   }
// //   throw new Error("Failed to start task");
// // }

// // async function waitForTaskRunning(taskArn: string, timeout = 60000, interval = 5000) {
// //   const startTime = Date.now();
// //   while (Date.now() - startTime < timeout) {
// //     const response = await ecs.send(new DescribeTasksCommand({
// //       cluster: CLUSTER,
// //       tasks: [taskArn],
// //     }));
// //     if (response.tasks && response.tasks.length > 0 && response.tasks[0].lastStatus === "RUNNING") {
// //       return response.tasks[0];
// //     }
// //     await new Promise(resolve => setTimeout(resolve, interval));
// //   }
// //   throw new Error("Timeout waiting for task to run");
// // }

// // async function getTaskPublicIP(task: any) {
// //   const attachment = task.attachments?.find((att: any) => att.type === "ElasticNetworkInterface");
// //   if (attachment) {
// //     const eniDetail = attachment.details.find((detail: any) => detail.name === "networkInterfaceId");
// //     if (eniDetail) {
// //       const eniId = eniDetail.value;
// //       const eniResponse = await ec2.send(new DescribeNetworkInterfacesCommand({
// //         NetworkInterfaceIds: [eniId],
// //       }));
// //       if (eniResponse.NetworkInterfaces && eniResponse.NetworkInterfaces.length > 0) {
// //         const publicIp = eniResponse.NetworkInterfaces[0].Association?.PublicIp;
// //         if (publicIp) return publicIp;
// //       }
// //     }
// //   }
// //   throw new Error("Public IP not found");
// // }

// // export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// //   if (req.method !== "POST") {
// //     return res.status(405).json({ error: "Method not allowed. Use POST." });
// //   }
  
// //   try {
// //     // Check if a task is already running
// //     let task = await getRunningTask();
// //     if (!task || !task.taskArn) {
// //       task = await startNewTask();
// //       if (!task.taskArn) {
// //         throw new Error("Newly started task does not have a taskArn.");
// //       }
// //       task = await waitForTaskRunning(task.taskArn);
// //     }
// //     // Optionally, get the public IP for confirmation.
// //     const publicIp = await getTaskPublicIP(task);
// //     return res.status(200).json({
// //       message: "Container started successfully.",
// //       taskArn: task.taskArn,
// //       publicIp,
// //     });
// //   } catch (error: any) {
// //     console.error("Error starting container:", error);
// //     return res.status(500).json({ error: error.message });
// //   }
// // }



// // pages/api/start-container.ts
// import type { NextApiRequest, NextApiResponse } from "next";
// import { ECSClient, ListTasksCommand, RunTaskCommand, DescribeTasksCommand } from "@aws-sdk/client-ecs";
// import { EC2Client, DescribeNetworkInterfacesCommand } from "@aws-sdk/client-ec2";

// const REGION = "ap-south-1";
// const CLUSTER = "tts-cluster";
// const TASK_DEFINITION = "tts-fargate-task";
// const SUBNET = "subnet-044f83181ad6a0174";
// const SECURITY_GROUP = "sg-0b8c9b2cb4f97de43";

// const ecs = new ECSClient({
//   region: REGION,
//   credentials: {
//     accessKeyId: process.env.ACCESS_KEY_ID!,
//     secretAccessKey: process.env.SECRET_ACCESS_KEY!
//   }
// });

// const ec2 = new EC2Client({
//   region: REGION,
//   credentials: {
//     accessKeyId: process.env.ACCESS_KEY_ID!,
//     secretAccessKey: process.env.SECRET_ACCESS_KEY!
//   }
// });

// async function getRunningTask() {
//   const listResponse = await ecs.send(new ListTasksCommand({
//     cluster: CLUSTER,
//     family: TASK_DEFINITION, // using family to filter by task definition family
//     desiredStatus: "RUNNING",
//   }));
//   if (listResponse.taskArns && listResponse.taskArns.length > 0) {
//     const taskArn = listResponse.taskArns[0];
//     const describeResponse = await ecs.send(new DescribeTasksCommand({
//       cluster: CLUSTER,
//       tasks: [taskArn],
//     }));
//     if (describeResponse.tasks && describeResponse.tasks.length > 0) {
//       return describeResponse.tasks[0];
//     }
//   }
//   return null;
// }

// async function startNewTask() {
//   const runTaskResponse = await ecs.send(new RunTaskCommand({
//     cluster: CLUSTER,
//     taskDefinition: TASK_DEFINITION,
//     launchType: "FARGATE",
//     networkConfiguration: {
//       awsvpcConfiguration: {
//         subnets: [SUBNET],
//         securityGroups: [SECURITY_GROUP],
//         assignPublicIp: "ENABLED",
//       },
//     },
//   }));
//   if (runTaskResponse.tasks && runTaskResponse.tasks.length > 0) {
//     return runTaskResponse.tasks[0];
//   }
//   throw new Error("Failed to start task");
// }

// async function waitForTaskRunning(taskArn: string, timeout = 60000, interval = 5000) {
//   const startTime = Date.now();
//   while (Date.now() - startTime < timeout) {
//     const response = await ecs.send(new DescribeTasksCommand({
//       cluster: CLUSTER,
//       tasks: [taskArn],
//     }));
//     if (response.tasks && response.tasks.length > 0 && response.tasks[0].lastStatus === "RUNNING") {
//       return response.tasks[0];
//     }
//     await new Promise(resolve => setTimeout(resolve, interval));
//   }
//   throw new Error("Timeout waiting for task to run");
// }

// async function getTaskPublicIP(task: any) {
//   const attachment = task.attachments?.find((att: any) => att.type === "ElasticNetworkInterface");
//   if (attachment) {
//     const eniDetail = attachment.details.find((detail: any) => detail.name === "networkInterfaceId");
//     if (eniDetail) {
//       const eniId = eniDetail.value;
//       const eniResponse = await ec2.send(new DescribeNetworkInterfacesCommand({
//         NetworkInterfaceIds: [eniId],
//       }));
//       if (eniResponse.NetworkInterfaces && eniResponse.NetworkInterfaces.length > 0) {
//         const publicIp = eniResponse.NetworkInterfaces[0].Association?.PublicIp;
//         if (publicIp) return publicIp;
//       }
//     }
//   }
//   throw new Error("Public IP not found");
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed. Use POST." });
//   }
  
//   try {
//     // Check if a task is already running
//     let task = await getRunningTask();
//     if (!task || !task.taskArn) {
//       task = await startNewTask();
//       if (!task.taskArn) {
//         throw new Error("Newly started task does not have a taskArn.");
//       }
//       task = await waitForTaskRunning(task.taskArn);
//     }
//     const publicIp = await getTaskPublicIP(task);
//     return res.status(200).json({
//       message: "Container started successfully.",
//       taskArn: task.taskArn,
//       publicIp,
//     });
//   } catch (error: any) {
//     console.error("Error starting container:", error);
//     return res.status(500).json({ error: error.message });
//   }
// }

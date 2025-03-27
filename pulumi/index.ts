import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

// Create a VPC for our EKS cluster
const vpc = new aws.ec2.Vpc("eks-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: "eks-vpc" },
});

// Create subnets for our VPC
const subnet = new aws.ec2.Subnet("eks-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-west-2a",
    tags: { Name: "eks-subnet" },
});

// Create a security group for our EKS cluster
const securityGroup = new aws.ec2.SecurityGroup("eks-security-group", {
    vpcId: vpc.id,
    description: "Allow all HTTP(s) traffic",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: { Name: "eks-security-group" },
});

// Create an EKS cluster
const eksCluster = new eks.Cluster("eks-cluster", {
    vpcId: vpc.id,
    subnetIds: [subnet.id],
    instanceType: "t2.medium",
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 3,
    storageClasses: "gp2",
    deployDashboard: false,
    skipDefaultNodeGroup: true,
    tags: { Name: "eks-cluster" },
});

// Export the EKS cluster name
export const eksClusterName = eksCluster.eksCluster.name;

// Create a Kubernetes provider instance
const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: eksCluster.kubeconfig,
});

// Deploy the CoreDNS Helm chart
const corednsRelease = new k8s.helm.v3.Release("coredns", {
    chart: "coredns",
    repositoryOpts: {
        repo: "https://charts.helm.sh/stable",
    },
    values: {}, // Add any custom values here
}, { provider: k8sProvider });

// Export the CoreDNS release name
export const corednsReleaseName = corednsRelease.name;

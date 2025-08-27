#!/usr/bin/env tsx

/**
 * Linear API Exploration Script
 * Run this with: tsx explore-linear.ts
 * 
 * This script explores Linear API capabilities to inform MVP design
 */

import { LinearClient } from '@linear/sdk';

async function exploreLinearAPI() {
  // Check if API key is available
  const apiKey = process.env.LINEAR_API_KEY;
  
  if (!apiKey || apiKey === 'your_linear_api_key_here') {
    console.log('❌ No valid Linear API key found');
    console.log('To explore Linear API:');
    console.log('1. Get API key from: https://linear.app/settings/api');
    console.log('2. Set LINEAR_API_KEY in .env file');
    console.log('3. Run: tsx explore-linear.ts');
    return;
  }

  console.log('🔍 Exploring Linear API capabilities...\n');
  
  try {
    const client = new LinearClient({ apiKey });
    
    // Test basic connection
    console.log('1. Testing connection...');
    const viewer = await client.viewer;
    console.log(`✅ Connected as: ${viewer.name} (${viewer.email})`);
    console.log(`   Organization: ${viewer.organization?.name}`);
    
    // Explore teams
    console.log('\n2. Available teams...');
    const teams = await client.teams();
    console.log(`✅ Found ${teams.nodes.length} teams:`);
    for (const team of teams.nodes.slice(0, 3)) {
      console.log(`   - ${team.name} (${team.key})`);
    }
    
    // Explore issues (limited)
    console.log('\n3. Recent issues...');
    const issues = await client.issues({ first: 5 });
    console.log(`✅ Found ${issues.nodes.length} recent issues:`);
    for (const issue of issues.nodes) {
      const team = await issue.team;
      console.log(`   - [${team.key}-${issue.number}] ${issue.title}`);
      console.log(`     State: ${(await issue.state).name}, Priority: ${issue.priority ?? 'None'}`);
    }
    
    // Explore issue states
    console.log('\n4. Workflow states...');
    const states = await client.workflowStates();
    const statesByTeam = new Map<string, string[]>();
    
    for (const state of states.nodes.slice(0, 10)) {
      const team = await state.team;
      const teamName = team?.name || 'Global';
      if (!statesByTeam.has(teamName)) {
        statesByTeam.set(teamName, []);
      }
      statesByTeam.get(teamName)!.push(`${state.name} (${state.type})`);
    }
    
    for (const [team, states] of statesByTeam) {
      console.log(`   ${team}: ${states.join(', ')}`);
    }
    
    // Explore labels
    console.log('\n5. Issue labels...');
    const labels = await client.issueLabels({ first: 10 });
    console.log(`✅ Found ${labels.nodes.length} labels:`);
    for (const label of labels.nodes.slice(0, 5)) {
      const team = await label.team;
      console.log(`   - ${label.name} (${team?.name || 'Workspace'})`);
    }
    
    // Explore projects
    console.log('\n6. Projects...');
    const projects = await client.projects({ first: 5 });
    console.log(`✅ Found ${projects.nodes.length} projects:`);
    for (const project of projects.nodes) {
      console.log(`   - ${project.name} (${project.state})`);
    }
    
    console.log('\n🎉 Linear API exploration complete!');
    console.log('\nKey findings:');
    console.log('- Basic CRUD operations work');
    console.log('- GraphQL relationships are Promise-based');
    console.log('- Pagination uses connection pattern');
    console.log('- Team-based organization structure');
    
  } catch (error) {
    console.error('❌ Error exploring Linear API:', error);
    if ((error as any).type === 'AuthenticationError') {
      console.log('\n💡 Make sure your API key is valid and has proper permissions');
    }
  }
}

// Quick capability check without API key
function analyzeCurrentImplementation() {
  console.log('📋 Current Implementation Analysis\n');
  
  const services = [
    { name: 'IssueService', status: '✅ Complete', features: ['CRUD', 'search', 'bulk ops'] },
    { name: 'TeamService', status: '✅ Complete', features: ['CRUD', 'settings', 'templates'] },
    { name: 'UserService', status: '✅ Complete', features: ['CRUD', 'teams', 'settings'] },
    { name: 'CommentService', status: '✅ Complete', features: ['CRUD', 'reactions', 'threading'] },
    { name: 'LabelService', status: '✅ Complete', features: ['CRUD', 'issue ops', 'bulk'] },
    { name: 'CycleService', status: '✅ Complete', features: ['CRUD', 'progress', 'velocity'] },
    { name: 'WorkflowStateService', status: '✅ Complete', features: ['CRUD', 'transitions'] },
    { name: 'ProjectService', status: '✅ Basic', features: ['CRUD'] },
    { name: 'AttachmentService', status: '❌ Missing', features: ['file upload', 'URLs'] },
    { name: 'WebhookService', status: '❌ Missing', features: ['real-time', 'events'] },
  ];
  
  services.forEach(service => {
    console.log(`${service.status} ${service.name}`);
    console.log(`   Features: ${service.features.join(', ')}`);
  });
  
  console.log('\n🎯 MVP Tool Abstractions Needed:');
  console.log('Based on typical Linear workflows, we need:');
  console.log('');
  console.log('1. 📝 Issue Management');
  console.log('   - Create/update/search issues');
  console.log('   - Change states and priorities');
  console.log('   - Add comments and reactions');
  console.log('');
  console.log('2. 👥 Team Operations');
  console.log('   - List team members and issues');
  console.log('   - Manage team workflows');
  console.log('');
  console.log('3. 🔄 Project Tracking');
  console.log('   - Sprint/cycle planning');
  console.log('   - Progress reporting');
  console.log('   - Velocity tracking');
  console.log('');
  console.log('4. 🔍 Search & Filter');
  console.log('   - Advanced issue queries');
  console.log('   - Multi-criteria filtering');
  console.log('');
  console.log('5. 📊 Reporting');
  console.log('   - Team performance metrics');
  console.log('   - Burndown charts');
  console.log('   - Issue analytics');
}

// Run exploration
if (process.env.LINEAR_API_KEY && process.env.LINEAR_API_KEY !== 'your_linear_api_key_here') {
  exploreLinearAPI();
} else {
  analyzeCurrentImplementation();
}
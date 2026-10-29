import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const lookupLimits=sqliteTable('lookup_limits',{key:text('key').primaryKey(),count:integer('count').notNull()});
export const attempts=sqliteTable('attempts',{id:text('id').primaryKey(),person:text('person').notNull(),name:text('name').notNull(),score:integer('score').notNull(),total:integer('total').notNull().default(10),version:integer('version').notNull().default(1),date:text('date').notNull(),consent:integer('consent').notNull(),answers:text('answers').notNull(),trainingId:text('training_id').notNull().default('induccion'),trainingRevision:integer('training_revision').notNull().default(1),snapshot:text('snapshot')});

export const trainings=sqliteTable('trainings',{id:text('id').primaryKey(),title:text('title').notNull(),description:text('description').notNull(),videos:text('videos').notNull(),questions:text('questions').notNull(),published:integer('published').notNull().default(0),startsAt:text('starts_at'),endsAt:text('ends_at'),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});

export const people=sqliteTable('people',{person:text('person').primaryKey(),docType:text('doc_type').notNull(),name:text('name').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const rosterImports=sqliteTable('roster_imports',{id:text('id').primaryKey(),source:text('source').notNull(),payloadHash:text('payload_hash').notNull(),stats:text('stats').notNull(),createdAt:text('created_at').notNull()});

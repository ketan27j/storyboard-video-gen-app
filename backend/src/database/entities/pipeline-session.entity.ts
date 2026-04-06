import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pipeline_sessions')
export class PipelineSession {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'text' })
  movieIdea: string;

  @Column({ type: 'text', nullable: true })
  storySnapshot: string;

  @Column({ type: 'text', nullable: true })
  finalResolution: string;

  @Column({ type: 'simple-json', nullable: true })
  characterDefinitions: Record<string, string>;

  @Column({ type: 'simple-json', nullable: true })
  scenes: any[];

  @Column({ default: 0 })
  currentSceneIndex: number;

  @Column({ default: 'initialized' })
  status: string;

  @Column({ default: 'idea' })
  screen: string;

  @Column({ type: 'boolean', default: false })
  isLoading: boolean;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
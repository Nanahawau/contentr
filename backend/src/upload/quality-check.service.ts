import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;

const execFileAsync = promisify(execFile);

type QualityBand = 'pass' | 'warn' | 'rejected';

export type QualityResult = {
  score: number;
  band: QualityBand;
  reason: string;
  durationSeconds: number;
  wordCount: number;
};

type FfprobeStream = {
  codec_type: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
};

type FfprobeData = {
  streams: FfprobeStream[];
  format: { duration?: string; bit_rate?: string };
};

type Rule<T> = {
  condition: (input: T) => boolean;
  score: number;
  reason: string;
};

type AudioVideoInput = { duration: number; bitrate: number };
type VideoInput = { height: number; fps: number };

const AUDIO_VIDEO_RULES: Rule<AudioVideoInput>[] = [
  {
    condition: ({ duration }) => duration < 10,
    score: 1,
    reason: 'File is too short (under 10 seconds).',
  },
  {
    condition: ({ duration, bitrate }) => duration < 30 && bitrate < 32,
    score: 3,
    reason: 'File is too short and has very low bitrate.',
  },
  {
    condition: ({ duration, bitrate }) => bitrate < 64 || duration < 60,
    score: 4,
    reason: 'Low bitrate or short duration may affect transcription quality.',
  },
  {
    condition: ({ duration, bitrate }) => bitrate < 128 || duration < 180,
    score: 6,
    reason:
      'Moderate quality — transcription should work but may have some errors.',
  },
  {
    condition: ({ duration, bitrate }) => bitrate < 256 || duration <= 300,
    score: 7,
    reason: 'Good quality file.',
  },
  {
    condition: () => true,
    score: 9,
    reason: 'Excellent quality file.',
  },
];

const WORD_COUNT_RULES: Rule<number>[] = [
  {
    condition: (count) => count < 50,
    score: 3,
    reason: 'Too few words — minimum is 50.',
  },
  {
    condition: (count) => count < 150,
    score: 5,
    reason: 'Short content — more words will produce better results.',
  },
  {
    condition: (count) => count < 500,
    score: 7,
    reason: 'Good amount of content detected.',
  },
  {
    condition: () => true,
    score: 9,
    reason: 'Excellent amount of content detected.',
  },
];

const VIDEO_MODIFIER_RULES: Rule<VideoInput>[] = [
  {
    condition: ({ height }) => height > 0 && height < 360,
    score: -2,
    reason: 'Low resolution video may reduce output quality.',
  },
  {
    condition: ({ fps }) => fps > 0 && fps < 15,
    score: -2,
    reason: 'Very low frame rate may reduce video quality.',
  },
  {
    condition: ({ height }) => height >= 720,
    score: 1,
    reason: '',
  },
  {
    condition: ({ fps }) => fps >= 24,
    score: 1,
    reason: '',
  },
];

function applyRules<T>(
  input: T,
  rules: Rule<T>[],
): { score: number; reason: string } {
  const match = rules.find(({ condition }) => condition(input));
  return {
    score: match?.score ?? 1,
    reason: match?.reason ?? 'Unable to determine quality.',
  };
}

function applyModifiers<T>(
  baseScore: number,
  baseReason: string,
  input: T,
  rules: Rule<T>[],
): { score: number; reason: string } {
  let score = baseScore;
  let reason = baseReason;
  for (const rule of rules) {
    if (rule.condition(input)) {
      score = Math.min(10, Math.max(1, score + rule.score));
      if (rule.reason) reason = rule.reason;
    }
  }
  return { score, reason };
}

@Injectable()
export class QualityCheckService {
  async check(file: Express.Multer.File): Promise<QualityResult> {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4') {
      return this.checkAudioVideo(file);
    }
    if (file.mimetype === 'application/pdf') {
      return this.checkPdf(file);
    }
    return this.checkText(file);
  }

  private async checkAudioVideo(
    file: Express.Multer.File,
  ): Promise<QualityResult> {
    const extension = file.originalname.split('.').pop() ?? 'tmp';
    const tempPath = join(
      '/tmp',
      `${randomBytes(8).toString('hex')}.${extension}`,
    );

    await writeFile(tempPath, file.buffer);

    let probeData: FfprobeData;
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_streams',
        '-show_format',
        tempPath,
      ]);
      probeData = JSON.parse(stdout) as FfprobeData;
    } catch {
      return {
        score: 1,
        band: 'rejected',
        reason: 'File is corrupt or cannot be read.',
        durationSeconds: 0,
        wordCount: 0,
      };
    } finally {
      await unlink(tempPath).catch(() => {});
    }

    const audioStream = probeData.streams?.find(
      (stream) => stream.codec_type === 'audio',
    );
    const videoStream = probeData.streams?.find(
      (stream) => stream.codec_type === 'video',
    );

    if (!audioStream && !videoStream) {
      return {
        score: 1,
        band: 'rejected',
        reason: 'No audio or video stream found in file.',
        durationSeconds: 0,
        wordCount: 0,
      };
    }

    const duration = parseFloat(probeData.format?.duration ?? '0');
    const bitrate = parseInt(probeData.format?.bit_rate ?? '0') / 1000;

    const { score: baseScore, reason: baseReason } = applyRules(
      { duration, bitrate },
      AUDIO_VIDEO_RULES,
    );

    if (!videoStream) {
      return {
        score: baseScore,
        band: this.toBand(baseScore),
        reason: baseReason,
        durationSeconds: duration,
        wordCount: 0,
      };
    }

    const [num, den] = (videoStream.r_frame_rate ?? '0/1')
      .split('/')
      .map(Number);
    const fps = (den ?? 0) > 0 ? (num ?? 0) / (den ?? 1) : 0;
    const videoInput: VideoInput = { height: videoStream.height ?? 0, fps };

    const { score, reason } = applyModifiers(
      baseScore,
      baseReason,
      videoInput,
      VIDEO_MODIFIER_RULES,
    );

    return { score, band: this.toBand(score), reason, durationSeconds: duration, wordCount: 0 };
  }

  private async checkPdf(file: Express.Multer.File): Promise<QualityResult> {
    try {
      const data = await pdfParse(file.buffer);
      return this.scoreByWordCount(data.text);
    } catch {
      return {
        score: 2,
        band: 'rejected',
        reason: 'PDF could not be read or is corrupt.',
        durationSeconds: 0,
        wordCount: 0,
      };
    }
  }

  private checkText(file: Express.Multer.File): QualityResult {
    const text = file.buffer.toString('utf-8');
    if (text.includes('�')) {
      return {
        score: 2,
        band: 'rejected',
        reason: 'File contains encoding errors and cannot be read.',
        durationSeconds: 0,
        wordCount: 0,
      };
    }
    return this.scoreByWordCount(text);
  }

  private scoreByWordCount(text: string): QualityResult {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const wordCount = words.length;
    const { score, reason } = applyRules(wordCount, WORD_COUNT_RULES);
    return { score, band: this.toBand(score), reason, durationSeconds: 0, wordCount };
  }

  private toBand(score: number): QualityBand {
    if (score <= 3) return 'rejected';
    if (score <= 6) return 'warn';
    return 'pass';
  }
}

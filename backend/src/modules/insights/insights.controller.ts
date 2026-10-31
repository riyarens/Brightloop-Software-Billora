import { Request, Response, NextFunction } from 'express';
import insightsService from './insights.service';

export class InsightsController {
  getChips = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chips = insightsService.getChips();
      return res.status(200).json(chips);
    } catch (error) {
      next(error);
    }
  };

  askAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question } = req.body;
      const result = await insightsService.askAssistant(question || '');
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const insightsController = new InsightsController();
export default insightsController;


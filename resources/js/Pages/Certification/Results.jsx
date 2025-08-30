import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Box, Container, Typography, Card, CardContent, Stack, Chip, Button, LinearProgress, Divider } from '@mui/material';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Results({ attempt, theoryQuestions, overall, message, auth }) {
  const safeOverall = overall || {};
  const passed = Boolean(safeOverall.passed);
  const rawPct = Number(safeOverall.percentage);
  const pct = Number.isFinite(rawPct) ? rawPct : 0;
  const score = Number.isFinite(Number(safeOverall.score)) ? safeOverall.score : 0;
  const maxScore = Number.isFinite(Number(safeOverall.maxScore)) ? safeOverall.maxScore : 0;
  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Certification Results" />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight={700} gutterBottom>Certification Results</Typography>
            <Typography variant="body1" color="text.secondary">{message}</Typography>
          </Box>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Chip label={passed ? 'PASSED' : 'NOT PASSED'} color={passed ? 'success' : 'error'} />
                  <Chip label={`Score: ${score}/${maxScore}`} />
                  <Chip label={`Percentage: ${pct.toFixed(1)}%`} color={pct >= 80 ? 'success' : 'warning'} />
                </Stack>
                <Box>
                  <Typography variant="caption" color="text.secondary">Overall Progress</Typography>
                  <LinearProgress variant="determinate" value={Math.min(100, pct)} sx={{ height: 10, borderRadius: 2, mt: 0.5 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Theory Question Review</Typography>
              <Stack spacing={1.5} sx={{ maxHeight: 480, overflowY: 'auto', pr: 1 }}>
                {theoryQuestions && theoryQuestions.length ? theoryQuestions.map((q,idx) => {
                  const correct = Array.isArray(q.correct_answer)? q.correct_answer.join(', '): (q.correct_answer || '—');
                  const userAns = Array.isArray(q.user_answer)? q.user_answer.join(', '): (q.user_answer || '—');
                  const isFreeForm = !q.options || q.options.length===0;
                  return (
                    <Box key={q.id} sx={{ border: '1px solid', borderColor: 'divider', p: 1.5, borderRadius: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>Q{idx+1}. {q.question}</Typography>
                        <Chip size="small" label={`${q.points_earned||0}/${q.max_points||0} pts`} color={q.is_correct? 'success':'default'} />
                      </Stack>
                      <Divider sx={{my:1}} />
                      <Typography variant="caption" display="block" color="text.secondary"><strong>Your Answer:</strong> {userAns}</Typography>
                      <Typography variant="caption" display="block" color="success.main"><strong>Correct Answer:</strong> {correct}</Typography>
                      {isFreeForm && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{mt:0.5}}>
                          (Free-form answer evaluated by AI grader)
                        </Typography>
                      )}
                      {q.explanation && (
                        <Typography variant="caption" display="block" sx={{mt:0.5}} color="info.main"><strong>Explanation / Ideal:</strong> {q.explanation}</Typography>
                      )}
                    </Box>
                  );
                }) : (
                  <Typography variant="body2" color="text.secondary">No theory questions recorded.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
            <Button onClick={() => router.post(route('certification.reset'))} variant="outlined" color="inherit">Restart</Button>
            <Button onClick={() => router.post(route('certification.generate-simulation'))} variant="contained" color="primary">Continue to Simulator →</Button>
          </Stack>
        </Stack>
      </Container>
    </AuthenticatedLayout>
  );
}

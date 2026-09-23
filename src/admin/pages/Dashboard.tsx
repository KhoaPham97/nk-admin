import { Box, Card, CardContent, Grid, Typography } from "@mui/material";

const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Dashboard
      </Typography>

      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography color="text.secondary">Tổng sản phẩm</Typography>

              <Typography variant="h4" fontWeight={700} mt={1}>
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography color="text.secondary">Tồn kho</Typography>

              <Typography variant="h4" fontWeight={700} mt={1}>
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography color="text.secondary">Đơn hàng</Typography>

              <Typography variant="h4" fontWeight={700} mt={1}>
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography color="text.secondary">Khách hàng</Typography>

              <Typography variant="h4" fontWeight={700} mt={1}>
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import {
    Box,
    Typography,
    TextField,
    Grid,
    FormGroup,
    FormControlLabel,
    Switch,
    Button,
    Alert,
    Stack,
    Divider,
    Card,
    CardContent,
    CardHeader,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    useTheme,
    Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import LinkIcon from '@mui/icons-material/Link';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TuneIcon from '@mui/icons-material/Tune';
import { vmin } from '@/styles/units';

// Attribute categories
const attributeCategories = {
    accessibility: ['wheelchair_accessible_entrance', 'wheelchair_accessible_restroom', 'wheelchair_accessible_parking', 'wheelchair_accessible_seating'],
    amenities: ['restroom', 'wifi', 'good_for_children', 'outdoor_seating', 'live_music', 'pet_friendly'],
    offerings: ['serves_breakfast', 'serves_brunch', 'serves_lunch', 'serves_dinner', 'serves_dessert', 'serves_coffee', 'serves_wine', 'serves_beer', 'serves_cocktails', 'vegetarian_options', 'vegan_options', 'happy_hour_drinks'],
    crowd: ['lgbtq_friendly', 'transgender_safespace', 'casual', 'cozy'],
    payments: ['credit_cards', 'debit_cards', 'nfc_mobile_payments'],
    planning: ['accepts_reservations'],
    service_options: ['dine_in', 'takeout', 'delivery', 'curbside_pickup'],
};

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const initialData = {
    name: 'Testowa Pizzeria "Smak i Styl"',
    address: 'ul. Przykladowa 1, 00-001 Warszawa',
    phone: '123-456-789',
    website: 'https://www.twoja-strona.pl',
    instagram: 'https://instagram.com/twojprofil',
    facebook: 'https://facebook.com/twojastrona',
    openingHours: {
        monday: { isOpen: true, from: '12:00', to: '22:00' },
        tuesday: { isOpen: true, from: '12:00', to: '22:00' },
        wednesday: { isOpen: true, from: '12:00', to: '22:00' },
        thursday: { isOpen: true, from: '12:00', to: '22:00' },
        friday: { isOpen: true, from: '12:00', to: '23:00' },
        saturday: { isOpen: true, from: '12:00', to: '23:00' },
        sunday: { isOpen: false, from: '12:00', to: '22:00' },
    },
    attributes: {
        wifi: true,
        dine_in: true,
        takeout: true,
        pet_friendly: true,
        credit_cards: true,
    }
};

export default function GbpManagementPanel() {
    const params = useParams<{ lang: string }>();
    const { t } = useTranslation(params.lang, 'dashboard');
    const [data, setData] = useState(initialData);
    const [isSaved, setIsSaved] = useState(false);
    const theme = useTheme();

    const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setData(prev => ({ ...prev, [field]: event.target.value }));
    };

    const handleAttributeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setData(prev => ({
            ...prev,
            attributes: { ...prev.attributes, [event.target.name]: event.target.checked }
        }));
    };

    const handleHoursChange = (day: string, field: string, value: string | boolean) => {
        setData(prev => ({
            ...prev,
            openingHours: {
                ...prev.openingHours,
                [day]: { ...prev.openingHours[day as keyof typeof prev.openingHours], [field]: value }
            }
        }));
    };

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 4,
                alignItems: 'flex-start',
                width: '100%',
                minHeight: '100vh',
                bgcolor: theme.palette.background.default,
                px: { xs: 1, md: 4 },
                py: { xs: 2, md: 4 },
            }}
        >
            {/* Left: Main content (70%) */}
            <Box sx={{ flex: 7, minWidth: 0 }}>
                <Alert
                    icon={<CheckCircleIcon fontSize="inherit" />}
                    severity="success"
                    sx={{
                        mb: 3,
                        borderRadius: 2,
                        fontWeight: 500,
                        alignItems: 'center',
                        bgcolor: theme.palette.success.light,
                        color: theme.palette.success.contrastText,
                    }}
                >
                    {t('gbp_panel.connected_alert')}
                </Alert>

                {/* Accordion: Business Details */}
                <Accordion defaultExpanded elevation={0} sx={{ mb: 2, borderRadius: 3, boxShadow: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <BusinessIcon color="primary" />
                            <Typography variant="h6" fontWeight={600}>{t('management.business_details')}</Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid>
                                <TextField label={t('gbp_panel.field_business_name')} value={data.name} onChange={handleInputChange('name')} fullWidth />
                            </Grid>
                            <Grid>
                                <TextField label={t('gbp_panel.field_address')} value={data.address} onChange={handleInputChange('address')} fullWidth />
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Contact & Links */}
                <Accordion defaultExpanded elevation={0} sx={{ mb: 2, borderRadius: 3, boxShadow: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <LinkIcon color="primary" />
                            <Typography variant="h6" fontWeight={600}>{t('management.contact_links')}</Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid>
                                <TextField label={t('gbp_panel.field_phone')} value={data.phone} onChange={handleInputChange('phone')} fullWidth />
                            </Grid>
                            <Grid>
                                <TextField label={t('gbp_panel.field_website')} value={data.website} onChange={handleInputChange('website')} fullWidth />
                            </Grid>
                            <Grid>
                                <TextField label={t('management.instagram_label')} value={data.instagram} onChange={handleInputChange('instagram')} fullWidth />
                            </Grid>
                            <Grid>
                                <TextField label={t('management.facebook_label')} value={data.facebook} onChange={handleInputChange('facebook')} fullWidth />
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Opening Hours */}
                <Accordion defaultExpanded elevation={0} sx={{ mb: 2, borderRadius: 3, boxShadow: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <AccessTimeIcon color="primary" />
                            <Typography variant="h6" fontWeight={600}>{t('management.opening_hours')}</Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Stack spacing={2}>
                            {daysOfWeek.map(day => {
                                const dayData = data.openingHours[day as keyof typeof data.openingHours];
                                return (
                                    <Grid container key={day} spacing={2} alignItems="center">
                                        <Grid>
                                            <FormControlLabel
                                                control={<Switch checked={dayData.isOpen} onChange={(e) => handleHoursChange(day, 'isOpen', e.target.checked)} />}
                                                label={t(`management.day_${day}`)}
                                            />
                                        </Grid>
                                        <Grid>
                                            {dayData.isOpen ? (
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <TextField type="time" value={dayData.from} onChange={(e) => handleHoursChange(day, 'from', e.target.value)} size="small" />
                                                    <Typography>–</Typography>
                                                    <TextField type="time" value={dayData.to} onChange={(e) => handleHoursChange(day, 'to', e.target.value)} size="small" />
                                                </Stack>
                                            ) : (
                                                <Typography color="text.secondary">{t('management.closed')}</Typography>
                                            )}
                                        </Grid>
                                    </Grid>
                                );
                            })}
                        </Stack>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Attributes */}
                <Accordion defaultExpanded elevation={0} sx={{ mb: 2, borderRadius: 3, boxShadow: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <TuneIcon color="primary" />
                            <Typography variant="h6" fontWeight={600}>{t('management.attributes_amenities')}</Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            {Object.entries(attributeCategories).map(([category, attributes]) => (
                                <Grid key={category}>
                                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', mb: 1, fontWeight: 500 }}>
                                        {t(`attributes.${category.replace('_extra', '')}`)}
                                    </Typography>
                                    <FormGroup>
                                        {attributes.map(attrKey => (
                                            <FormControlLabel
                                                key={attrKey}
                                                control={<Switch checked={!!data.attributes[attrKey as keyof typeof data.attributes]} onChange={handleAttributeChange} name={attrKey} />}
                                                label={t(`attributes.${attrKey}`)}
                                            />
                                        ))}
                                    </FormGroup>
                                </Grid>
                            ))}
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Save Button */}
                <Box sx={{ mt: 4, display: 'flex', alignItems: 'center' }}>
                    <Button variant="contained" size="large" onClick={handleSave} sx={{ fontWeight: 600 }}>
                        {t('management.save_changes')} (Symulacja)
                    </Button>
                    {isSaved && <Typography color="success.main" sx={{ display: 'inline', ml: 2, fontWeight: 500 }}>{t('gbp_panel.saved')}</Typography>}
                </Box>
            </Box>

            {/* Right: Sticky Preview (30%) */}
            <Box
                sx={{
                    flex: 3,
                    minWidth: 0,
                    position: 'sticky',
                    top: { xs: 16, md: 32 },
                    alignSelf: 'flex-start',
                    zIndex: 1,
                }}
            >
                <Card
                    elevation={3}
                    sx={{
                        borderRadius: 4,
                        boxShadow: `0 ${vmin(2)} ${vmin(16)} 0 rgba(60,64,67,.15)`,
                        bgcolor: theme.palette.background.paper,
                        minWidth: 0,
                    }}
                >
                    <CardHeader
                        title={
                            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                                {t('gbp_panel.preview_title')}
                            </Typography>
                        }
                        sx={{ pb: 0 }}
                    />
                    <Divider />
                    <CardContent sx={{ pt: 2 }}>
                        <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
                            {data.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {data.address}
                        </Typography>
                        <Typography sx={{ mt: 1 }}>{data.phone}</Typography>
                        <Box sx={{ mt: 1 }}>
                            <Link href={data.website} target="_blank" rel="noopener" color="primary" underline="hover" variant="body2">
                                {data.website}
                            </Link>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={500}>
                            {t('gbp_panel.hours_today')}
                        </Typography>
                        <Typography suppressHydrationWarning>
                            {(() => {
                                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                                const dayData = data.openingHours[today as keyof typeof data.openingHours];
                                return dayData.isOpen ? `${dayData.from} - ${dayData.to}` : t('gbp_panel.closed');
                            })()}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Grid,
  GridItem,
  SimpleGrid,
  Input,
  Textarea,
  Select,
  Button,
  FormControl,
  FormLabel,
  Icon,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import HushhTechHeader from "../components/hushh-tech-header/HushhTechHeader";

/** Home-aligned serif for headings (Playfair). Body uses global Manrope from `index.css`. */
const playfair = { fontFamily: "'Playfair Display', serif" };

/** Greys aligned with `home/ui.tsx` Tailwind tokens (gray-*, ios-gray-bg). */
const iosGrayBg = "#F5F5F7";
const gray50 = "#F9FAFB";
const gray100 = "#F3F4F6";
const gray200 = "#E5E7EB";
const gray300 = "#D1D5DB";
const gray500 = "#6B7280";
const gray900 = "#111827";

const pageBg = iosGrayBg;
const brandBlue = "#0066CC";
const cardBorder = "rgba(229, 231, 235, 0.6)";
const inputFocus = {
  borderColor: brandBlue,
  boxShadow: `0 0 0 1px ${brandBlue}`,
};

/** Shared field chrome — matches home gray inputs / ios-gray-bg section. */
const fieldChrome = {
  borderRadius: "lg" as const,
  borderColor: gray200,
  bg: gray50,
  color: gray900,
  _placeholder: { color: gray500 },
  _hover: { borderColor: gray300 },
  _focusVisible: inputFocus,
};

const cardHoverBorder = "rgba(0, 102, 204, 0.3)";

const buttonFocusVisible = {
  _focusVisible: inputFocus,
};

const CAPTCHA_ERROR_ID = "contact-captcha-error";

const reasonOptions = [
  "Infrastructure Consultation",
  "Investment Information",
  "Technical Support",
  "Other"
];

export default function Contact() {
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    reason: '',
    message: '',
    captcha: '',
    website: '',
  });

  const [captchaError, setCaptchaError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const generateRandomNumbers = () => {
    const randomNum1 = Math.floor(Math.random() * 100);
    const randomNum2 = Math.floor(Math.random() * 100);
    setNum1(randomNum1);
    setNum2(randomNum2);
  };

  useEffect(() => {
    generateRandomNumbers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "captcha" && captchaError) {
      setCaptchaError("");
    }
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const userCaptcha = parseInt(formData.captcha, 10);
    const correctAnswer = num1 + num2;

    if (userCaptcha !== correctAnswer) {
      setCaptchaError("Incorrect sum. Please try again.");
      return;
    }

    setCaptchaError("");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          email: formData.email,
          phone: formData.phone,
          reason: formData.reason,
          message: formData.message,
          website: formData.website,
          sourcePath: window.location.pathname,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to send message");
      }

      toast.success("Message sent successfully.");
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        reason: '',
        message: '',
        captcha: '',
        website: '',
      });
      generateRandomNumbers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again later.";
      console.error("Failed to send contact message:", message);
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box bg={pageBg} minH="100vh" className="antialiased text-gray-900">
      <HushhTechHeader />
      <Box
        as="main"
        id="main-content"
        w="100%"
      >
      <Container maxW="7xl" py={{ base: 10, md: 14 }} px={{ base: 4, md: 6, lg: 8 }}>
        {/* Main Header */}
        <Box textAlign="center" mb={{ base: 8, md: 10 }}>
          <Heading
            as="h1"
            size={{ base: "2xl", md: "3xl" }}
            mb={4}
            letterSpacing="tight"
            lineHeight="1.15"
            fontWeight="400"
            color="black"
            style={playfair}
          >
            <Text as="span" fontWeight="400">
              Get in{" "}
            </Text>
            <Text
              as="span"
              fontWeight="300"
              fontStyle="italic"
              color={gray500}
            >
              Touch
            </Text>
          </Heading>

          <Text
            fontSize={{ base: "md", md: "lg" }}
            maxW="3xl"
            mx="auto"
            color={gray500}
            fontWeight="300"
            lineHeight="1.65"
          >
            Ready to transform your investment strategy? We'd love to hear from you.
          </Text>

          <Text
            mt={4}
            fontSize={{ base: "md", md: "md" }}
            color={gray500}
            fontWeight="400"
            lineHeight="1.65"
          >
            For career-related inquiries, please visit our{" "}
            <ChakraLink
              href="/career"
              // target="_blank"
              rel="noopener noreferrer"
              color={brandBlue}
              fontWeight="600"
              _hover={{ color: brandBlue, textDecoration: "underline" }}
            >
              Jobs page
            </ChakraLink>
            . For all other inquiries, please submit the form below.
          </Text>
        </Box>

        {/* Contact Form and Information */}
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
          gap={{ base: 8, md: 10 }}
          mt={{ base: 6, md: 8 }}
          maxW="5xl"
          mx="auto"
          alignItems="start"
        >
          {/* Contact Form */}
          <GridItem
            as={Box}
            p={{ base: 6, md: 8 }}
            borderRadius="2xl"
            borderWidth="1px"
            borderColor={cardBorder}
            bg="white"
            boxShadow="0 8px 30px -4px rgba(0, 0, 0, 0.04)"
            transition="border-color 0.2s ease"
            _hover={{ borderColor: cardHoverBorder }}
          >
            <Heading
              as="h2"
              size="lg"
              mb={6}
              color="black"
              fontWeight="500"
              style={playfair}
            >
              Send us a Message
            </Heading>

            <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <VStack spacing={5} align="stretch">
                <Input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  display="none"
                />
                <SimpleGrid
                  columns={{ base: 1, md: 2 }}
                  spacing={5}
                  alignItems="start"
                  w="full"
                  data-testid="contact-form-field-row"
                >
                  <FormControl isRequired>
                    <FormLabel fontWeight="500" fontSize="sm" color={gray500} mb={1.5}>
                      Full Name
                    </FormLabel>
                    <Input
                      name="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      size="lg"
                      h="48px"
                      {...fieldChrome}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontWeight="500" fontSize="sm" color={gray500} mb={1.5}>
                      Company
                    </FormLabel>
                    <Input
                      name="company"
                      placeholder="Enter your company name (optional)"
                      value={formData.company}
                      onChange={handleChange}
                      size="lg"
                      h="48px"
                      {...fieldChrome}
                    />
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid
                  columns={{ base: 1, md: 2 }}
                  spacing={5}
                  alignItems="start"
                  w="full"
                  data-testid="contact-form-field-row"
                >
                  <FormControl isRequired>
                    <FormLabel fontWeight="500" fontSize="sm" color={gray500} mb={1.5}>
                      Email Address
                    </FormLabel>
                    <Input
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleChange}
                      size="lg"
                      h="48px"
                      {...fieldChrome}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontWeight="500" fontSize="sm" color={gray500} mb={1.5}>
                      Phone Number
                    </FormLabel>
                    <Input
                      name="phone"
                      placeholder="Enter your phone number (optional)"
                      value={formData.phone}
                      onChange={handleChange}
                      size="lg"
                      h="48px"
                      {...fieldChrome}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel fontWeight="500" fontSize="sm" color={gray500} mb={1.5}>
                    Reason for Contact
                  </FormLabel>
                  <Select
                    name="reason"
                    placeholder="Select a reason"
                    value={formData.reason}
                    onChange={handleChange}
                    size="lg"
                    h="48px"
                    {...fieldChrome}
                  >
                    {reasonOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="500" fontSize="sm" color={gray500} mb={1.5}>
                    Message
                  </FormLabel>
                  <Textarea
                    name="message"
                    placeholder="Tell us how we can help you..."
                    value={formData.message}
                    onChange={handleChange}
                    size="md"
                    minH="120px"
                    rows={4}
                    {...fieldChrome}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="500" fontSize="sm" color={gray500} mb={1.5}>
                    What is the sum of {num1} and {num2}?
                  </FormLabel>
                  <Input
                    name="captcha"
                    inputMode="numeric"
                    placeholder="Enter the answer"
                    value={formData.captcha}
                    onChange={handleChange}
                    size="lg"
                    h="48px"
                    aria-invalid={captchaError ? true : undefined}
                    aria-describedby={captchaError ? CAPTCHA_ERROR_ID : undefined}
                    isDisabled={isSubmitting}
                    {...fieldChrome}
                  />
                  <Text
                    id={CAPTCHA_ERROR_ID}
                    role="alert"
                    aria-live="polite"
                    color={captchaError ? "#FF3B30" : "transparent"}
                    fontSize="sm"
                    mt={1}
                    minH="20px"
                  >
                    {captchaError}
                  </Text>
                </FormControl>

                <Box pt={6} mt={1} borderTopWidth="1px" borderTopColor={gray100}>
                  <Button
                    type="submit"
                    width="full"
                    size="lg"
                    h="52px"
                    borderRadius="lg"
                    fontWeight="600"
                    bg="gray.900"
                    color="white"
                    isLoading={isSubmitting}
                    isDisabled={isSubmitting}
                    loadingText="Sending..."
                    aria-busy={isSubmitting}
                    _hover={{ bg: isSubmitting ? "gray.900" : "black" }}
                    _active={{ bg: "black" }}
                    _disabled={{ bg: "gray.900", opacity: 0.7, cursor: "not-allowed" }}
                    {...buttonFocusVisible}
                  >
                    Submit Message
                  </Button>
                </Box>
              </VStack>
            </form>
          </GridItem>

          {/* Contact Information */}
          <GridItem>
            <Box
              p={{ base: 6, md: 8 }}
              borderRadius="2xl"
              borderWidth="1px"
              borderColor={cardBorder}
              bg={iosGrayBg}
              boxShadow="0 8px 30px -4px rgba(0, 0, 0, 0.03)"
              mb={8}
              transition="border-color 0.2s ease"
              _hover={{ borderColor: cardHoverBorder }}
            >
              <Heading
                as="h2"
                size="lg"
                mb={6}
                color="black"
                fontWeight="500"
                style={playfair}
              >
                Contact Information
              </Heading>

              <VStack spacing={6} align="start">
                <HStack spacing={4} align="flex-start">
                  <Icon
                    as={MapPin}
                    aria-hidden
                    color={brandBlue}
                    boxSize={5}
                    mt={1}
                    strokeWidth={1.75}
                  />
                  <Box>
                    <Text fontWeight="600" color="gray.900" fontSize="sm">
                      Address
                    </Text>
                    <Text color={gray500} fontSize="sm" lineHeight="1.6" mt={0.5} fontWeight="300">
                      1021 5th St W
                    </Text>
                    <Text color={gray500} fontSize="sm" lineHeight="1.6" fontWeight="300">
                      Kirkland, WA 98033
                    </Text>
                  </Box>
                </HStack>

                <HStack spacing={4} align="flex-start">
                  <Icon
                    as={Phone}
                    aria-hidden
                    color={brandBlue}
                    boxSize={5}
                    mt={1}
                    strokeWidth={1.75}
                  />
                  <Box>
                    <Text fontWeight="600" color="gray.900" fontSize="sm">
                      Phone
                    </Text>
                    <Text color={gray500} fontSize="sm" lineHeight="1.6" mt={0.5} fontWeight="300">
                      (888) 462-1726
                    </Text>
                  </Box>
                </HStack>

                <HStack spacing={4} align="flex-start">
                  <Icon
                    as={Clock}
                    aria-hidden
                    color={brandBlue}
                    boxSize={5}
                    mt={1}
                    strokeWidth={1.75}
                  />
                  <Box>
                    <Text fontWeight="600" color="gray.900" fontSize="sm">
                      Office Hours
                    </Text>
                    <Text color={gray500} fontSize="sm" lineHeight="1.6" mt={0.5} fontWeight="300">
                      Monday - Friday
                    </Text>
                    <Text color={gray500} fontSize="sm" lineHeight="1.6" fontWeight="300">
                      9:00 AM - 6:00 PM PST
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            </Box>

            <Box
              p={{ base: 6, md: 8 }}
              borderRadius="2xl"
              bg="#1D1D1F"
              color="white"
              boxShadow="0 20px 40px -12px rgba(0, 0, 0, 0.2)"
              borderWidth="1px"
              borderColor="rgba(255, 255, 255, 0.08)"
            >
              <Heading
                as="h3"
                size="lg"
                mb={4}
                fontWeight="500"
                color="white"
                style={playfair}
              >
                Ready to Invest?
              </Heading>
              <Text
                mb={6}
                color="rgba(255, 255, 255, 0.5)"
                lineHeight="1.65"
                fontSize="md"
                fontWeight="300"
              >
                Join forward-thinking investors who are already benefiting from our
                AI-driven approach to wealth creation.
              </Text>
              <Button
                width="full"
                size="lg"
                h="52px"
                borderRadius="lg"
                bg="white"
                color="gray.900"
                fontWeight="600"
                borderWidth="1px"
                borderColor={gray200}
                rightIcon={
                  <Icon as={ArrowRight} aria-hidden boxSize={4} color={gray900} />
                }
                _hover={{ bg: gray50 }}
                _active={{ bg: gray100 }}
                onClick={() => navigate("/about/leadership")}
                {...buttonFocusVisible}
              >
                Learn About Our Strategy
              </Button>
            </Box>
          </GridItem>
        </Grid>

        <ToastContainer />
      </Container>
      </Box>
    </Box>
  );
}

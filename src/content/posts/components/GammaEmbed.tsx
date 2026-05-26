import React from "react";
import { Box, Image, VStack } from "@chakra-ui/react";
import { Helmet } from "react-helmet";

interface GammaEmbedProps {
  title: string;
  description: string;
  src: string;
  assetSrc?: string;
  imageBaseSrc?: string;
  imagePageCount?: number;
}

const GammaEmbed: React.FC<GammaEmbedProps> = ({
  title,
  description,
  src,
  assetSrc,
  imageBaseSrc,
  imagePageCount = 0,
}) => {
  const frameSrc = assetSrc || src;
  const imagePages = imageBaseSrc
    ? Array.from({ length: imagePageCount }, (_, index) => {
        const pageNumber = String(index + 1).padStart(3, "0");
        return `${imageBaseSrc}/page-${pageNumber}.jpg`;
      })
    : [];

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <Box
        bg="#f8fafc"
        minH="100vh"
        px={{ base: 4, md: 8 }}
        pt={{ base: 20, md: 24 }}
        pb={{ base: 12, md: 16 }}
      >
        {imagePages.length ? (
          <VStack spacing={{ base: 4, md: 6 }} align="stretch">
            {imagePages.map((imageSrc, index) => (
              <Box
                key={imageSrc}
                bg="white"
                borderRadius="18px"
                boxShadow="0 16px 48px rgba(15, 23, 42, 0.12)"
                overflow="hidden"
              >
                <Image
                  src={imageSrc}
                  alt={`${title} page ${index + 1}`}
                  display="block"
                  width="100%"
                  loading={index < 2 ? "eager" : "lazy"}
                />
              </Box>
            ))}
          </VStack>
        ) : (
          <Box
            as="iframe"
            src={frameSrc}
            title={title}
            allowFullScreen
            width="100%"
            minHeight={{ base: "72vh", md: "82vh" }}
            border="0"
            display="block"
            borderRadius="18px"
            boxShadow="0 16px 48px rgba(15, 23, 42, 0.12)"
            bg="white"
          />
        )}
      </Box>
    </>
  );
};

export default GammaEmbed;
